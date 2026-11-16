/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NAVIGATION SERVICE
 * File: backend/cms-service/src/services/navigation.service.js
 * ============================================================================
 */

const { navigationRepository } = require('../repositories');
const cache = require('../config/cache');

class NavigationService {
  async getPublicNavigation(restaurantId = 1) {
    const cacheKey = await cache.buildKey('navigation', `${restaurantId}`);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const rawMenus = await navigationRepository.getPublicNavigation(restaurantId);

    // Structure flat menu list into hierarchical tree with child items
    const menuMap = {};
    const rootMenus = [];

    rawMenus.forEach(item => {
      menuMap[item.MenuId] = { ...item, children: [] };
    });

    rawMenus.forEach(item => {
      if (item.ParentMenuId && menuMap[item.ParentMenuId]) {
        menuMap[item.ParentMenuId].children.push(menuMap[item.MenuId]);
      } else {
        rootMenus.push(menuMap[item.MenuId]);
      }
    });

    const result = {
      header: rootMenus.filter(m => m.MenuLocation === 'HEADER'),
      footerExplore: rootMenus.filter(m => m.MenuLocation === 'FOOTER_EXPLORE'),
      mobileDrawer: rootMenus.filter(m => m.MenuLocation === 'MOBILE_DRAWER'),
      all: rootMenus,
    };

    await cache.set(cacheKey, result, cache.TTL.NAVIGATION);
    return result;
  }

  async listNavigationMenus(params) {
    return navigationRepository.listNavigationMenus(params);
  }

  async createNavigationMenu(data) {
    const menu = await navigationRepository.createNavigationMenu(data);
    await cache.invalidatePublicCache('navigation-create');
    return menu;
  }

  async updateNavigationMenu(menuId, data) {
    const menu = await navigationRepository.updateNavigationMenu(menuId, data);
    await cache.invalidatePublicCache('navigation-update');
    return menu;
  }

  async deleteNavigationMenu(menuId) {
    const result = await navigationRepository.deleteNavigationMenu(menuId);
    await cache.invalidatePublicCache('navigation-delete');
    return result;
  }
}

module.exports = new NavigationService();

