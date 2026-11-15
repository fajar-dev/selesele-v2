import { createUiFixture } from './support/uiFixture'

const fixture = await createUiFixture()
try {
  const runner = Bun.spawn(['bunx', 'playwright', 'test'], { env: { ...process.env, E2E_ORIGIN: fixture.origin, E2E_WORKSPACE: fixture.workspaceId, E2E_OWNER_TOKEN: fixture.ownerToken, E2E_MEMBER_TOKEN: fixture.memberToken, E2E_VIEWER_TOKEN: fixture.viewerToken }, stdout: 'inherit', stderr: 'inherit' })
  const exit = await runner.exited
  if (exit !== 0) {
    process.exitCode = exit
  }
} finally {
  await fixture.close()
}
