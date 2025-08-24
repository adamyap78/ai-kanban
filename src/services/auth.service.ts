import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../utils/db';
import { users, organizations, userOrganizations } from '../db/schema';
import { createId } from '@paralleldrive/cuid2';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser extends User {
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
  }>;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = '7d';

export class AuthService {
  async register(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ user: User; token: string }> {
    console.log('🔍 Checking if user exists:', userData.email);
    
    // Check if user already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('❌ User already exists');
      throw new Error('User already exists with this email');
    }

    console.log('🔐 Hashing password...');
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    console.log('👤 Creating user in database...');
    // Create user
    const newUser = await db.insert(users).values({
      name: userData.name,
      email: userData.email,
      passwordHash,
    }).returning();

    if (!newUser[0]) {
      console.log('❌ Failed to create user');
      throw new Error('Failed to create user');
    }

    const user = newUser[0];
    console.log('✅ User created:', user.id);

    // Create personal organization for the user
    console.log('🏢 Creating organization...');
    const orgSlug = `${userData.name.toLowerCase().replace(/\s+/g, '-')}-${createId().slice(-4)}`;
    const newOrg = await db.insert(organizations).values({
      name: `${userData.name}'s Organization`,
      slug: orgSlug,
      createdBy: user.id,
    }).returning();

    if (newOrg[0]) {
      console.log('✅ Organization created:', newOrg[0].id);
      // Add user as owner of the organization
      await db.insert(userOrganizations).values({
        userId: user.id,
        organizationId: newOrg[0].id,
        role: 'owner',
      });
      console.log('✅ User added to organization as owner');
    }

    console.log('🎫 Generating JWT token...');
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt!,
        updatedAt: user.updatedAt!,
      },
      token,
    };
  }

  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    // Find user
    const userResult = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = userResult[0]!;

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Get user organizations
    const userOrgs = await db.select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: userOrganizations.role,
    })
      .from(userOrganizations)
      .innerJoin(organizations, eq(organizations.id, userOrganizations.organizationId))
      .where(eq(userOrganizations.userId, user.id));

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt!,
        updatedAt: user.updatedAt!,
        organizations: userOrgs,
      },
      token,
    };
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      
      // Get user with organizations
      const userResult = await db.select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (userResult.length === 0) {
        return null;
      }

      const user = userResult[0]!;

      // Get user organizations
      const userOrgs = await db.select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: userOrganizations.role,
      })
        .from(userOrganizations)
        .innerJoin(organizations, eq(organizations.id, userOrganizations.organizationId))
        .where(eq(userOrganizations.userId, user.id));

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt!,
        updatedAt: user.updatedAt!,
        organizations: userOrgs,
      };
    } catch (error) {
      return null;
    }
  }

  async getUserById(userId: string): Promise<AuthUser | null> {
    const userResult = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      return null;
    }

    const user = userResult[0]!;

    // Get user organizations
    const userOrgs = await db.select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: userOrganizations.role,
    })
      .from(userOrganizations)
      .innerJoin(organizations, eq(organizations.id, userOrganizations.organizationId))
      .where(eq(userOrganizations.userId, user.id));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt!,
      updatedAt: user.updatedAt!,
      organizations: userOrgs,
    };
  }
}

export const authService = new AuthService();