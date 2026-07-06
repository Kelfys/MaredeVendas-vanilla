import { describe, it, expect } from 'vitest'
import {
  MODERATOR_PERMISSIONS,
  getModeratorPermissionValue,
  canApprovePlanChanges,
} from '../js/roles.js'

describe('moderator permissions', () => {
  it('lists configurable moderator permissions', () => {
    expect(MODERATOR_PERMISSIONS.some((p) => p.id === 'can_approve_plan_changes')).toBe(true)
  })

  it('reads plan approval permission from moderator profile', () => {
    const moderator = { role: 'moderator', can_approve_plan_changes: true }
    expect(getModeratorPermissionValue(moderator, 'can_approve_plan_changes')).toBe(true)
    expect(canApprovePlanChanges(moderator)).toBe(true)
  })

  it('denies plan approval when permission is off', () => {
    const moderator = { role: 'moderator', can_approve_plan_changes: false }
    expect(getModeratorPermissionValue(moderator, 'can_approve_plan_changes')).toBe(false)
    expect(canApprovePlanChanges(moderator)).toBe(false)
  })
})