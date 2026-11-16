import api from './api';

export const cmsService = {
  async getSettings(restaurantId = 1, branchId = null) {
    const params = { restaurantId };
    if (branchId) params.branchId = branchId;
    const res = await api.get('/cms/public/settings', { params });
    return res.data.data;
  },

  async getSEO(slug = null, pageId = null) {
    const params = {};
    if (slug) params.slug = slug;
    if (pageId) params.pageId = pageId;
    const res = await api.get('/cms/public/seo', { params });
    return res.data.data;
  },

  async getPublicPage(slug, preview = false) {
    const params = preview ? { preview: 'true' } : {};
    const res = await api.get(`/cms/public/pages/${slug}`, { params });
    return res.data.data;
  },

  async getBanners(location = 'HOME_HERO') {
    const res = await api.get('/cms/public/banners', { params: { location } });
    return res.data.data || [];
  },

  async getNavigation() {
    const res = await api.get('/cms/public/navigation');
    return res.data.data;
  },

  async getFooter() {
    const res = await api.get('/cms/public/footer');
    return res.data.data;
  },

  async getFAQs(category = null) {
    const params = category ? { category } : {};
    const res = await api.get('/cms/public/faqs', { params });
    return res.data.data || [];
  },

  async getTestimonials(featuredOnly = true) {
    const res = await api.get('/cms/public/testimonials', { params: { featured: featuredOnly } });
    return res.data.data || [];
  },

  async getSocialLinks() {
    const res = await api.get('/cms/public/social-links');
    return res.data.data || [];
  },

  async submitContactMessage(payload) {
    const body = {
      senderName: payload.senderName || payload.Name || payload.name,
      senderEmail: payload.senderEmail || payload.Email || payload.email,
      senderPhone: payload.senderPhone || payload.Phone || payload.phone || null,
      subject: payload.subject || payload.Subject || 'General Inquiry',
      inquiryType: payload.inquiryType || payload.InquiryType || 'GENERAL',
      messageBody: payload.messageBody || payload.Message || payload.message,
    };
    const res = await api.post('/cms/public/contact', body);
    return res.data;
  },

  async submitContact(payload) {
    return this.submitContactMessage(payload);
  },
};
