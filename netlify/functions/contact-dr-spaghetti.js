const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async function(event){
  if(event.httpMethod !== "POST"){
    return {
      statusCode:405,
      body:JSON.stringify({ error:"Method not allowed" })
    };
  }

  try{
    const { name, email, message } = JSON.parse(event.body || "{}");

    if(!name || !email || !message){
      return {
        statusCode:400,
        body:JSON.stringify({ error:"Name, email, and message are required." })
      };
    }

    await resend.emails.send({
      from:"Movie Hole <onboarding@resend.dev>",
      to:process.env.NOTIFICATION_EMAIL,
      replyTo:email,
      subject:`Contact Dr. Spaghetti: ${name}`,
      html:`
        <h1>New Contact Dr. Spaghetti Message</h1>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
    });

    return {
      statusCode:200,
      body:JSON.stringify({ success:true })
    };

  }catch(error){
    return {
      statusCode:500,
      body:JSON.stringify({ error:error.message })
    };
  }
};