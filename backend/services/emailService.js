const deliveryProvider = () => String(process.env.EMAIL_PROVIDER || (process.env.NODE_ENV === "production" ? "" : "capture")).toLowerCase();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deliverPasswordReset = async ({ email, resetUrl }, { fetchImpl = fetch, capture } = {}) => {
  const provider=deliveryProvider();
  if(provider==="capture"){
    if(process.env.NODE_ENV==="production")throw Object.assign(new Error("Development delivery is unavailable in production."),{code:"EMAIL_PROVIDER_INVALID"});
    if(typeof capture==="function")await capture({email,resetUrl});
    return{provider:"capture",delivered:Boolean(capture)};
  }
  if(provider!=="webhook")throw Object.assign(new Error("Email provider is not configured."),{code:"EMAIL_PROVIDER_NOT_CONFIGURED"});
  const attempts=Number(process.env.EMAIL_DELIVERY_MAX_RETRIES||3);
  for(let attempt=1;attempt<=attempts;attempt+=1){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Number(process.env.EMAIL_DELIVERY_TIMEOUT_MS||5000));try{const response=await fetchImpl(process.env.EMAIL_DELIVERY_URL,{method:"POST",signal:controller.signal,headers:{"content-type":"application/json",authorization:`Bearer ${process.env.EMAIL_DELIVERY_TOKEN}`},body:JSON.stringify({from:process.env.EMAIL_FROM,to:email,template:"password-reset",variables:{resetUrl}})});if(response.ok)return{provider:"webhook",delivered:true};if(response.status<500&&response.status!==408&&response.status!==429)throw Object.assign(new Error("Email delivery failed."),{code:"EMAIL_DELIVERY_FAILED"});}catch(error){if(attempt===attempts||error.code==="EMAIL_DELIVERY_FAILED")throw Object.assign(new Error("Email delivery failed."),{code:"EMAIL_DELIVERY_FAILED"});}finally{clearTimeout(timer)}if(attempt<attempts)await delay(Math.min(250*2**(attempt-1),1000));}
};
module.exports={deliverPasswordReset,deliveryProvider};
