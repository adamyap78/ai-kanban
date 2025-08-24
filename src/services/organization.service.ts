import { eq, and } from 'drizzle-orm';
import { db } from '../utils/db';
import { organizations, userOrganizations, boards } from '../db/schema';
import { createId } from '@paralleldrive/cuid2';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  userRole?: 'owner' | 'admin' | 'member' | 'viewer';
}

export class OrganizationService {
  async create(data: {
    name: string;
    slug: string;
    userId: string;
  }): Promise<Organization> {
    console.log('🏢 Creating organization:', data.name, data.slug);

    // Check if slug already exists
    const existingOrg = await db.select()
      .from(organizations)
      .where(eq(organizations.slug, data.slug))
      .limit(1);

    if (existingOrg.length > 0) {
      throw new Error('An organization with this name already exists');
    }

    // Create organization
    const newOrg = await db.insert(organizations).values({
      name: data.name,
      slug: data.slug,
      createdBy: data.userId,
    }).returning();

    if (!newOrg[0]) {
      throw new Error('Failed to create organization');
    }

    const org = newOrg[0];
    console.log('✅ Organization created:', org.id);

    // Add user as owner
    await db.insert(userOrganizations).values({
      userId: data.userId,
      organizationId: org.id,
      role: 'owner',
    });

    console.log('✅ User added as owner of organization');

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdBy: org.createdBy,
      createdAt: org.createdAt!,
      updatedAt: org.updatedAt!,
      userRole: 'owner',
    };
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const userOrgs = await db.select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdBy: organizations.createdBy,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
      role: userOrganizations.role,
    })
      .from(userOrganizations)
      .innerJoin(organizations, eq(organizations.id, userOrganizations.organizationId))
      .where(eq(userOrganizations.userId, userId));

    return userOrgs.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdBy: org.createdBy,
      createdAt: org.createdAt!,
      updatedAt: org.updatedAt!,
      userRole: org.role,
    }));
  }

  async getBySlug(slug: string, userId: string): Promise<Organization | null> {
    const result = await db.select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdBy: organizations.createdBy,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
      role: userOrganizations.role,
    })
      .from(organizations)
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, organizations.id))
      .where(and(
        eq(organizations.slug, slug),
        eq(userOrganizations.userId, userId)
      ))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const org = result[0]!;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdBy: org.createdBy,
      createdAt: org.createdAt!,
      updatedAt: org.updatedAt!,
      userRole: org.role,
    };
  }

  async update(orgId: string, userId: string, data: { name: string }): Promise<Organization> {
    console.log('📝 Updating organization:', orgId);

    // Check if user has permission (admin or owner)
    const userOrg = await db.select()
      .from(userOrganizations)
      .where(and(
        eq(userOrganizations.organizationId, orgId),
        eq(userOrganizations.userId, userId)
      ))
      .limit(1);

    if (userOrg.length === 0) {
      throw new Error('Organization not found or access denied');
    }

    if (!['owner', 'admin'].includes(userOrg[0]!.role)) {
      throw new Error('Insufficient permissions to update organization');
    }

    // Update organization
    const updatedOrg = await db.update(organizations)
      .set({ 
        name: data.name,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, orgId))
      .returning();

    if (!updatedOrg[0]) {
      throw new Error('Failed to update organization');
    }

    const org = updatedOrg[0];
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdBy: org.createdBy,
      createdAt: org.createdAt!,
      updatedAt: org.updatedAt!,
      userRole: userOrg[0]!.role,
    };
  }
}

export const organizationService = new OrganizationService();