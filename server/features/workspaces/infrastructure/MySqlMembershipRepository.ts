import { and, asc, eq, ne } from 'drizzle-orm'
import type { MembershipRepository } from '../domain/MembershipRepository'
import type { InviteRole } from '../../../../shared/kernel/workspace'
import type { Database } from '../../../platform/database/client'
import { workspaceMembers, users } from '../../../platform/database/schema'

const memberColumns = { userId: users.id, email: users.email, name: users.name, avatar: users.avatar, role: workspaceMembers.role }

export class MySqlMembershipRepository implements MembershipRepository {
  constructor(private readonly db: Database) {}

  members(id: string) {
    return this.db.select(memberColumns)
      .from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, id)).orderBy(asc(workspaceMembers.joinedAt))
  }

  async member(workspaceId: string, userId: string) {
    const [member] = await this.db.select(memberColumns).from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(users.id, userId))).limit(1)
    return member || null
  }

  async memberByEmail(workspaceId: string, email: string) {
    const [member] = await this.db.select(memberColumns).from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(users.email, email))).limit(1)
    return member || null
  }

  async changeRole(id: string, userId: string, role: InviteRole) {
    const [result] = await this.db.update(workspaceMembers).set({ role })
      .where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId), ne(workspaceMembers.role, 'owner')))
    return result.affectedRows > 0
  }

  async removeMember(id: string, userId: string) {
    const [result] = await this.db.delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId), ne(workspaceMembers.role, 'owner')))
    return result.affectedRows > 0
  }
}
