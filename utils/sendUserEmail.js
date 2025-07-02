const Email = require('./email');
const db = require('../config/db');

module.exports = async (options) => {
  const { newUser, verifyURL, tokenField, expiresField } = options;

  try {
    await new Email(newUser, verifyURL).sendEmailVerification();
  } catch (err) {
    // Clear the token fields if provided
    if (tokenField && expiresField && user.user_id) {
      await db.query(
        `UPDATE users SET ${tokenField} = NULL, ${expiresField} = NULL WHERE user_id = $1`,
        [user.user_id]
      );
    }

    throw new Error('There was an error sending the email. Try again later!');
  }
};
