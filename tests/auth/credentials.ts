/**
 * Test user credentials.
 * Set TEST_USER_EMAIL and TEST_USER_PASSWORD in your environment
 * or .env file to enable authenticated tests.
 *
 * Example .env:
 *   TEST_USER_EMAIL=admin@example.com
 *   TEST_USER_PASSWORD=your-password
 */
export const CREDENTIALS = {
  email: process.env.TEST_USER_EMAIL || '',
  password: process.env.TEST_USER_PASSWORD || '',
}

export const hasCredentials = !!(CREDENTIALS.email && CREDENTIALS.password)
