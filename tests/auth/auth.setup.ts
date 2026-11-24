import { test as setup } from '@playwright/test'
import dotenv from 'dotenv'
import jwt from '../../gara-bot-server/node_modules/jsonwebtoken/index.js'
import path from 'path'
import fs from 'fs'

dotenv.config()
dotenv.config({ path: 'gara-bot-server/.env' })

const AUTH_FILE = path.resolve('playwright/.auth/user.json')
const JWT_SECRET = process.env.JWT_SECRET || 'vt-auto-secret-key-change-in-prod'

setup('authenticate', async ({}) => {
  const token = jwt.sign(
    {
      id: '5952c302-6998-4804-8121-80a663c81fb5',
      email: 'luuviet2810@gmail.com',
      name: 'LƯU VĂN VIỆT',
      role: 'admin',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  fs.writeFileSync(
    AUTH_FILE,
    JSON.stringify(
      {
        cookies: [],
        origins: [
          {
            origin: 'http://localhost:5173',
            localStorage: [
              {
                name: 'vtauto_auth_token',
                value: token,
              },
            ],
          },
        ],
      },
      null,
      2
    )
  )
  console.log('✅ Auth setup complete with valid admin JWT token')
})
