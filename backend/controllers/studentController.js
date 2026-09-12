const {
  createStudent,
  getAllStudents,
  getStudentsByInstitution,
  getStudentById,
  updateStudent,
  studentHasCredentials,
  reassignStudentInstitution,
  linkStudentToUser,
} = require("../models/studentModel");
const { findUserForAuthentication } = require("../models/userModel");
const { getInstitutionById } = require("../models/institutionModel");
const { createAuditLog } = require("../models/auditModel");
const { paginationFromQuery, buildPaginationMetadata } = require("../utils/pagination");
const { normaliseSearchTerm, escapeLikePattern, validateSortOrder } = require("../utils/queryHelpers");

const create = async (req, res) => {
  try {
    const {
      studentNumber,
      fullName,
      email,
      programme,
      institutionId,
    } = req.body || {};

    if (
      !studentNumber ||
      !fullName ||
      !programme ||
      !institutionId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student number, full name, programme and institution ID are required.",
      });
    }

    if (
      req.user.role !== "super_admin" &&
      req.user.institutionId !== institutionId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot create students for another institution.",
      });
    }

    const institution = await getInstitutionById(institutionId);
    if (!institution) return res.status(404).json({ success: false, message: "The selected institution does not exist." });
    if (!institution.status) return res.status(422).json({ success: false, message: "Students cannot be created in an inactive institution." });

    const student = await createStudent({
      studentNumber: studentNumber.trim(),
      fullName: fullName.trim(),
      email: email ? email.trim().toLowerCase() : null,
      programme: programme.trim(),
      institutionId,
    });
    await createAuditLog({ userId: req.user.userId, institutionId: student.institution_id, action: "STUDENT_CREATED", entityType: "student", entityId: student.id, details: {}, ipAddress: req.ip, userAgent: req.get?.("user-agent") || null });

    return res.status(201).json({
      success: true,
      message: "Student created successfully.",
      student,
    });
  } catch (error) {
    require("../utils/logger").log("error", "student_creation_failed", { errorCode: error.code || "DATABASE_ERROR" });

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "This student number already exists for the selected institution.",
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "The selected institution does not exist.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create student.",
    });
  }
};

const list = async (req, res) => {
  try {
    let result;
    const paging = paginationFromQuery(req.query); const search = normaliseSearchTerm(req.query.search);
    const requestedInstitution = req.query.institutionId || null;
    if (req.user.role !== "super_admin" && requestedInstitution && requestedInstitution !== req.user.institutionId) return res.status(403).json({ success: false, message: "You cannot query students from another institution.", code: "ACCESS_DENIED" });
    const options = { ...paging, search: search ? `%${escapeLikePattern(search)}%` : null, programme: req.query.programme ? `%${escapeLikePattern(req.query.programme)}%` : null, sortBy: req.query.sortBy || "created_at", sortOrder: validateSortOrder(req.query.sortOrder) };

    if (req.user.role === "super_admin") {
      result = requestedInstitution ? await getStudentsByInstitution(requestedInstitution, options) : await getAllStudents(options);
    } else {
      result = await getStudentsByInstitution(req.user.institutionId, options);
    }
    const students = Array.isArray(result) ? result : result.rows; const total = Array.isArray(result) ? result.length : result.total;

    return res.status(200).json({
      success: true,
      total,
      students,
      pagination: buildPaginationMetadata({ page: paging.page, limit: paging.limit, total }),
    });
  } catch (error) {
    require("../utils/logger").log("error", "student_listing_failed", { errorCode: error.code || "DATABASE_ERROR" });

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve students.",
    });
  }
};

const getOne = async (req, res) => {
  try {
    const student = await getStudentById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    if (
      req.user.role !== "super_admin" &&
      req.user.institutionId !==
        student.institution_id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot view a student from another institution.",
      });
    }

    return res.status(200).json({
      success: true,
      student,
    });
  } catch (error) {
    require("../utils/logger").log("error", "student_retrieval_failed", { errorCode: error.code || "DATABASE_ERROR" });

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve student.",
    });
  }
};

const update = async (req, res) => {
  try {
    const current = await getStudentById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: "Student not found." });
    if (req.user.role !== "super_admin" && req.user.institutionId !== current.institution_id) return res.status(403).json({ success: false, message: "You cannot edit a student from another institution." });
    const next = { studentNumber: req.body.studentNumber.trim(), fullName: req.body.fullName.trim(), email: req.body.email ? req.body.email.trim().toLowerCase() : null, programme: req.body.programme.trim() };
    const student = await updateStudent(current.id, next);
    await createAuditLog({ userId: req.user.userId, institutionId: current.institution_id, action: "STUDENT_UPDATED", entityType: "student", entityId: current.id, details: { before: { studentNumber: current.student_number, fullName: current.full_name, email: current.email, programme: current.programme }, after: next }, ipAddress: req.ip, userAgent: req.get?.("user-agent") || null });
    return res.json({ success: true, message: "Student updated successfully.", student });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ success: false, message: "This student number already exists for the selected institution." });
    require("../utils/logger").log("error", "student_update_failed", { errorCode: error.code || "DATABASE_ERROR" });
    return res.status(500).json({ success: false, message: "Failed to update student." });
  }
};

const assignInstitution = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") return res.status(403).json({ success: false, message: "Only a super administrator may reassign students." });
    const current = await getStudentById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: "Student not found." });
    const institution = await getInstitutionById(req.body.institutionId);
    if (!institution) return res.status(404).json({ success: false, message: "Institution not found." });
    if (!institution.status) return res.status(422).json({ success: false, message: "Students cannot be assigned to an inactive institution." });
    if (await studentHasCredentials(current.id)) return res.status(409).json({ success: false, message: "A student with credential history cannot be reassigned. Historical credential ownership must remain unchanged." });
    const student = await reassignStudentInstitution(current.id, req.body.institutionId);
    await createAuditLog({ userId: req.user.userId, institutionId: req.body.institutionId, action: "STUDENT_INSTITUTION_REASSIGNED", entityType: "student", entityId: current.id, details: { oldInstitutionId: current.institution_id, newInstitutionId: req.body.institutionId }, ipAddress: req.ip, userAgent: req.get?.("user-agent") || null });
    return res.json({ success: true, message: "Student institution reassigned.", student });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ success: false, message: "This student number already exists for the selected institution." });
    require("../utils/logger").log("error", "student_reassignment_failed", { errorCode: error.code || "DATABASE_ERROR" });
    return res.status(500).json({ success: false, message: "Failed to reassign student." });
  }
};

const linkAccount = async (req, res) => {
  try {
    const student = await getStudentById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found." });
    if (req.user.role !== "super_admin" && req.user.institutionId !== student.institution_id) {
      return res.status(403).json({ success: false, message: "You cannot link an account outside your institution." });
    }
    if (student.user_id) return res.status(409).json({ success: false, message: "This student is already linked to an account." });

    const user = await findUserForAuthentication(req.body.userId);
    if (!user) return res.status(404).json({ success: false, message: "Student account not found." });
    if (user.role !== "student") return res.status(422).json({ success: false, message: "Only student accounts may be linked to student records." });
    if (!user.is_active || user.institution_active === false) return res.status(403).json({ success: false, message: "The student account or institution is inactive." });
    if (user.institution_id !== student.institution_id) return res.status(403).json({ success: false, message: "The student account must belong to the same institution." });

    const linked = await linkStudentToUser(student.id, user.id);
    if (!linked) return res.status(409).json({ success: false, message: "The student or account is already linked." });
    await createAuditLog({ userId: req.user.userId, institutionId: student.institution_id, action: "STUDENT_ACCOUNT_LINKED", entityType: "student", entityId: student.id, details: { accountUserId: user.id }, ipAddress: req.ip, userAgent: req.get?.("user-agent") || null });
    return res.status(200).json({ success: true, message: "Student account linked successfully.", student: linked });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ success: false, message: "The student account is already linked to a student record." });
    require("../utils/logger").log("error", "student_account_link_failed", { errorCode: error.code || "DATABASE_ERROR" });
    return res.status(500).json({ success: false, message: "Failed to link student account." });
  }
};

module.exports = {
  create,
  list,
  getOne,
  update,
  assignInstitution,
  linkAccount,
};
