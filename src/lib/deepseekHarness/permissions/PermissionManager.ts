/**
 * DeepSeek Harness - Capability & Permission Manager
 * Enforces fine-grained permission boundaries across plugins and tools.
 * MIT License
 */

import { PermissionScope, PermissionGrant, PermissionRequest } from '../types';
import { harnessEventBus } from '../events/HarnessEventBus';

export class PermissionManager {
  private static instance: PermissionManager;
  private grants: Map<string, Set<PermissionScope>> = new Map(); // entityKey (e.g. pluginId or 'global') -> granted scopes
  private auditLog: Array<{
    timestamp: number;
    entityId: string;
    scope: PermissionScope;
    allowed: boolean;
    reason?: string;
  }> = [];

  // Default baseline permissions for standard AI operations
  private readonly DEFAULT_SCOPES: PermissionScope[] = [
    'tools:read',
    'tools:execute',
    'network:search',
    'memory:read',
    'memory:write',
    'storage:read',
  ];

  // Elevated sensitive permissions that require explicit policy verification
  private readonly SENSITIVE_SCOPES: PermissionScope[] = [
    'system:control',
    'system:app_launch',
    'code:execute',
    'storage:write',
    'contacts:read',
    'plugins:manage',
  ];

  private constructor() {
    // Grant baseline scopes to the global harness agent
    this.grantPermissions('global', this.DEFAULT_SCOPES, 'system');
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Grant a set of scopes to a plugin or entity.
   */
  public grantPermissions(
    entityId: string,
    scopes: PermissionScope[],
    grantedBy: 'system' | 'user' | 'policy' = 'system'
  ): void {
    if (!this.grants.has(entityId)) {
      this.grants.set(entityId, new Set());
    }
    const current = this.grants.get(entityId)!;
    scopes.forEach((s) => current.add(s));

    harnessEventBus.emit('permission.granted', { entityId, scopes, grantedBy });
  }

  /**
   * Revoke specific permission scopes from an entity.
   */
  public revokePermissions(entityId: string, scopes: PermissionScope[]): void {
    const current = this.grants.get(entityId);
    if (!current) return;
    scopes.forEach((s) => current.delete(s));
    harnessEventBus.emit('permission.revoked', { entityId, scopes });
  }

  /**
   * Verify if an entity or tool execution has the required permission scopes.
   */
  public checkPermission(
    entityId: string,
    requiredScope: PermissionScope
  ): { allowed: boolean; reason?: string } {
    // Check specific entity grant
    const entityGrants = this.grants.get(entityId);
    const globalGrants = this.grants.get('global');

    const hasEntityGrant = entityGrants?.has(requiredScope);
    const hasGlobalGrant = globalGrants?.has(requiredScope);

    const isAllowed = Boolean(hasEntityGrant || hasGlobalGrant);

    // Record audit entry
    this.auditLog.push({
      timestamp: Date.now(),
      entityId,
      scope: requiredScope,
      allowed: isAllowed,
      reason: isAllowed
        ? 'Granted by active capability grant'
        : `Missing required capability scope: '${requiredScope}'`,
    });

    if (this.auditLog.length > 500) {
      this.auditLog.shift();
    }

    if (!isAllowed) {
      return {
        allowed: false,
        reason: `Access Denied: Entity '${entityId}' lacks permission '${requiredScope}'.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check multiple permissions at once.
   */
  public checkAllPermissions(
    entityId: string,
    requiredScopes: PermissionScope[]
  ): { allowed: boolean; missingScopes: PermissionScope[] } {
    const missing: PermissionScope[] = [];
    for (const scope of requiredScopes) {
      const check = this.checkPermission(entityId, scope);
      if (!check.allowed) {
        missing.push(scope);
      }
    }

    return {
      allowed: missing.length === 0,
      missingScopes: missing,
    };
  }

  /**
   * Get list of all granted scopes for an entity.
   */
  public getGrantedScopes(entityId: string): PermissionScope[] {
    const direct = Array.from(this.grants.get(entityId) || []);
    const global = Array.from(this.grants.get('global') || []);
    return Array.from(new Set([...direct, ...global]));
  }

  /**
   * Access permission audit logs for security transparency.
   */
  public getAuditLog() {
    return [...this.auditLog];
  }
}

export const permissionManager = PermissionManager.getInstance();
