import { Request, Response } from 'express';
import { db } from '../db/index';
import { userTable, engineerTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUsers = await db.select().from(userTable).where(eq(userTable.email, email));
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const existingEngineers = await db.select().from(engineerTable).where(eq(engineerTable.email, email.toLowerCase()));
    
    if (existingEngineers.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied. Your email is not registered as an engineer.' 
      });
    }

    const engineer = existingEngineers[0];
    if (engineer.engineerName !== name) {
      return res.status(403).json({ 
        error: 'Access denied. Name does not match our engineer records.' 
      });
    }

    const userId = uuidv4();
    await db.insert(userTable).values({
      id: userId,
      name,
      email: email.toLowerCase(),
      password: password,
      role: role || 'engineer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await db.select().from(userTable).where(eq(userTable.email, email.toLowerCase()));
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    if (password !== user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ 
      message: 'Login successful', 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    res.status(200).json({ 
      success: true,
      message: 'Logout successful' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    const users = await db.select().from(userTable).where(eq(userTable.email, email.toLowerCase()));
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = uuidv4();
    const expiresAt = Date.now() + 15 * 60 * 1000; 

    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset OTP - Service Vale',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007AFF;">Password Reset Request</h2>
            <p>Hello ${user.name},</p>
            <p>You requested to reset your password. Use the OTP below to verify your identity:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007AFF; margin: 0; font-size: 32px;">${otp}</h1>
            </div>
            <p>This OTP will expire in 15 minutes.</p>
            <p>If you didn't request this reset, please ignore this email.</p>
            <br/>
            <p>Best regards,<br/>Service Vale Team</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      
      res.status(200).json({ 
        message: 'OTP sent successfully to your email',
        resetToken 
      });

    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return res.status(500).json({ error: 'Failed to send email' });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    
    const storedOtpData = otpStore.get(email.toLowerCase());
    
    if (!storedOtpData) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(email.toLowerCase()); 
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const resetToken = uuidv4();
    
    otpStore.set(email.toLowerCase() + '_reset', { 
      otp: resetToken, 
      expiresAt: Date.now() + 30 * 60 * 1000 
    });

    otpStore.delete(email.toLowerCase());

    res.status(200).json({ 
      message: 'OTP verified successfully',
      resetToken 
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword, email } = req.body;
    
    if (!token || !newPassword || !email) {
      return res.status(400).json({ error: 'Token, email, and new password are required' });
    }

    const storedTokenData = otpStore.get(email.toLowerCase() + '_reset');
    
    if (!storedTokenData) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (Date.now() > storedTokenData.expiresAt) {
      otpStore.delete(email.toLowerCase() + '_reset');
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    if (storedTokenData.otp !== token) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const users = await db.select().from(userTable).where(eq(userTable.email, email.toLowerCase()));
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    
    await db.update(userTable)
      .set({ 
        password: newPassword,
        updatedAt: new Date().toISOString()
      })
      .where(eq(userTable.id, user.id));

    otpStore.delete(email.toLowerCase() + '_reset');

    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Successful - Service Vale',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007AFF;">Password Reset Successful</h2>
            <p>Hello ${user.name},</p>
            <p>Your password has been successfully reset.</p>
            <p>If you did not perform this action, please contact support immediately.</p>
            <br/>
            <p>Best regards,<br/>Service Vale Team</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Confirmation email error:', emailError);
    }

    res.status(200).json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};