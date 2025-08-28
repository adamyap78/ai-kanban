import { Router } from 'express';
import { organizationService } from '../services/organization.service';
import { boardService } from '../services/board.service';
import { createOrganizationSchema } from '../utils/validation';
import { validateBody, flashMessages } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply auth and flash messages to all organization routes
router.use(requireAuth);
router.use(flashMessages);

console.log('🔗 Organization routes loaded');

// GET /orgs/new - Create organization form
router.get('/new', (req, res) => {
  res.render('pages/organizations/new', {
    title: 'Create Organization',
    hx: false,
    errors: res.locals.validationErrors || [],
    oldInput: res.locals.oldInput || {},
  });
});

// POST /orgs - Create organization
router.post('/',
  validateBody(createOrganizationSchema),
  async (req, res) => {
    console.log('🔄 Creating organization:', req.body);
    
    try {
      const organization = await organizationService.create({
        name: req.body.name,
        slug: req.body.slug,
        userId: req.user!.id,
      });

      console.log('✅ Organization created successfully:', organization.id);
      res.redirect(`/orgs/${organization.slug}?success=Organization created successfully`);
    } catch (error) {
      console.error('❌ Organization creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create organization';
      res.redirect('/orgs/new?error=' + encodeURIComponent(errorMessage));
    }
  }
);

// GET /orgs/:slug - Organization dashboard
router.get('/:slug', async (req, res) => {
  console.log('📋 Loading organization:', req.params.slug);
  
  try {
    const organization = await organizationService.getBySlug(req.params.slug, req.user!.id);
    
    if (!organization) {
      return res.status(404).render('pages/404', { 
        title: 'Organization Not Found',
        hx: false 
      });
    }

    // Get boards for this organization
    const boards = await boardService.getByOrganization(organization.id, req.user!.id);

    res.render('pages/organizations/show', {
      title: organization.name,
      hx: false,
      organization,
      boards,
    });
  } catch (error) {
    console.error('❌ Error loading organization:', error);
    res.status(500).render('pages/error', { 
      title: 'Error',
      error: process.env.NODE_ENV === 'development' ? error : {},
      hx: false 
    });
  }
});

// GET /orgs/:slug/settings - Organization settings
router.get('/:slug/settings', async (req, res) => {
  try {
    const organization = await organizationService.getBySlug(req.params.slug, req.user!.id);
    
    if (!organization) {
      return res.status(404).render('pages/404', { 
        title: 'Organization Not Found',
        hx: false 
      });
    }

    // Check if user has admin/owner permissions
    if (!['owner', 'admin'].includes(organization.userRole!)) {
      return res.status(403).render('pages/error', { 
        title: 'Access Denied',
        error: { message: 'You do not have permission to access organization settings' },
        hx: false 
      });
    }

    res.render('pages/organizations/settings', {
      title: `${organization.name} - Settings`,
      hx: false,
      organization,
      errors: res.locals.validationErrors || [],
      oldInput: res.locals.oldInput || {},
    });
  } catch (error) {
    console.error('❌ Error loading organization settings:', error);
    res.status(500).render('pages/error', { 
      title: 'Error',
      error: process.env.NODE_ENV === 'development' ? error : {},
      hx: false 
    });
  }
});

// POST /orgs/:slug/settings - Update organization
router.post('/:slug/settings', async (req, res) => {
  console.log('📝 Updating organization:', req.params.slug);
  
  try {
    const organization = await organizationService.getBySlug(req.params.slug, req.user!.id);
    
    if (!organization) {
      return res.status(404).render('pages/404', { 
        title: 'Organization Not Found',
        hx: false 
      });
    }

    const updatedOrg = await organizationService.update(organization.id, req.user!.id, {
      name: req.body.name,
    });

    console.log('✅ Organization updated successfully');
    res.redirect(`/orgs/${organization.slug}?success=Organization updated successfully`);
  } catch (error) {
    console.error('❌ Organization update failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update organization';
    res.redirect(`/orgs/${req.params.slug}/settings?error=` + encodeURIComponent(errorMessage));
  }
});

// POST /orgs/:slug/delete - Delete organization
router.post('/:slug/delete', async (req, res) => {
  console.log('🗑️ Deleting organization:', req.params.slug);
  
  try {
    const organization = await organizationService.getBySlug(req.params.slug, req.user!.id);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user has owner permissions
    if (organization.userRole !== 'owner') {
      return res.status(403).json({ error: 'Only organization owners can delete organizations' });
    }

    // Check if organization has any boards
    const boards = await boardService.getByOrganization(organization.id, req.user!.id);
    if (boards.length > 0) {
      return res.status(400).json({ error: 'Cannot delete organization with existing boards' });
    }

    await organizationService.delete(organization.id, req.user!.id);

    console.log('✅ Organization deleted successfully');
    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Organization deletion failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete organization';
    return res.status(500).json({ error: errorMessage });
  }
});

export default router;