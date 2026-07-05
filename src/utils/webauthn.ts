// WebAuthn / Passkey utilities
// Uses the Web Authentication API for biometric login

// Check if WebAuthn is supported
export function isWebAuthnSupported(): boolean {
  return !!(window.PublicKeyCredential)
}

// Get available authenticator types
export function getAuthenticatorInfo(): string {
  if (!isWebAuthnSupported()) {
    return 'Không hỗ trợ'
  }

  const publicKey = window.PublicKeyCredential
  const userVerification = publicKey.isUserVerifyingPlatformAuthenticatorAvailable()
    ? 'UVPA'
    : 'External'

  const conditionalUI = publicKey.isConditionalMediationAvailable
    ? 'Conditional UI'
    : 'Standard'

  return `${userVerification} | ${conditionalUI}`
}

// Generate random bytes for challenges
function generateRandomBytes(length: number = 32): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

// Convert ArrayBuffer to Base64 string
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Convert Base64 string to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Registration options
export interface PasskeyRegistrationOptions {
  userId: string
  userName: string
  userDisplayName: string
}

export interface PasskeyCredential {
  credentialId: string
  publicKey: string
  deviceName: string
}

// Register a new passkey
export async function registerPasskey(options: PasskeyRegistrationOptions): Promise<PasskeyCredential | null> {
  if (!isWebAuthnSupported()) {
    console.error('WebAuthn not supported')
    return null
  }

  try {
    const challenge = generateRandomBytes(32)
    const userIdBuffer = new TextEncoder().encode(options.userId)

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Gara Manager',
        id: window.location.hostname || 'localhost',
      },
      user: {
        id: userIdBuffer,
        name: options.userName,
        displayName: options.userDisplayName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    }

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null

    if (!credential) {
      console.error('Failed to create credential')
      return null
    }

    const response = credential.response as AuthenticatorAttestationResponse
    const credentialId = bufferToBase64(credential.rawId)
    const publicKey = bufferToBase64(response.getPublicKey()!)
    const deviceName = getDeviceName()

    return {
      credentialId,
      publicKey,
      deviceName,
    }
  } catch (error) {
    console.error('Error registering passkey:', error)
    return null
  }
}

// Get device name for display
function getDeviceName(): string {
  const ua = navigator.userAgent

  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Mac/i.test(ua) && /Intel/i.test(ua)) return 'Mac'
  if (/Mac/i.test(ua) && /Apple Silicon/i.test(ua)) return 'Mac (Apple Silicon)'
  if (/Windows/i.test(ua)) return 'Windows PC'
  if (/Android/i.test(ua)) return 'Android Phone'
  if (/Linux/i.test(ua)) return 'Linux PC'

  return 'Unknown Device'
}

// Authentication options
export interface PasskeyAuthenticationOptions {
  credentialId: string
  userName: string
}

// Authenticate with passkey
export async function authenticateWithPasskey(
  options: PasskeyAuthenticationOptions
): Promise<{ success: boolean; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'Trình duyệt không hỗ trợ đăng nhập sinh trắc học' }
  }

  try {
    const credentialIdBuffer = base64ToBuffer(options.credentialId)
    const challenge = generateRandomBytes(32)

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname || 'localhost',
      allowCredentials: [
        {
          id: credentialIdBuffer,
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'preferred',
      timeout: 60000,
    }

    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    })) as PublicKeyCredential | null

    if (!assertion) {
      return { success: false, error: 'Xác thực bị hủy' }
    }

    // Update counter in database (would be done server-side in production)
    const response = assertion.response as AuthenticatorAssertionResponse
    console.log('✅ Passkey authentication successful')
    console.log('Authenticator counter:', response.authenticatorExtension?.authenticatorPreviousSignCount)

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error authenticating with passkey:', errorMessage)

    if (errorMessage.includes('NotAllowedError')) {
      return { success: false, error: 'Xác thực bị hủy hoặc hết thời gian' }
    }

    return { success: false, error: 'Xác thực thất bại: ' + errorMessage }
  }
}

// Get available passkeys (for login UI)
export async function getAvailablePasskeys(): Promise<Array<{ id: string; name: string }>> {
  // In a real app, this would fetch registered passkeys from the server
  // For demo purposes, we return empty array - passkeys are stored locally
  return []
}

// Check if biometric authentication is available
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false

  try {
    // Check for platform authenticator (Touch ID, Face ID, Windows Hello, etc.)
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    return available
  } catch {
    return false
  }
}
