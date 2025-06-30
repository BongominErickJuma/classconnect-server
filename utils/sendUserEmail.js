const sendEmail = require('./email');
const db = require('../config/db');

module.exports = async (options) => {
  const {
    email,
    subject,
    message,
    tokenField = null,
    expiresField = null,
    userId = null,
  } = options;

  try {
    await sendEmail({
      email,
      subject,
      message,
    });

    return { status: 'success', message: 'Token sent to email' };
  } catch (err) {
    // Clear the token fields if provided
    if (tokenField && expiresField && userId) {
      await db.query(
        `UPDATE users SET ${tokenField} = NULL, ${expiresField} = NULL WHERE user_id = $1`,
        [userId]
      );
    }

    throw new Error('There was an error sending the email. Try again later!');
  }
};
