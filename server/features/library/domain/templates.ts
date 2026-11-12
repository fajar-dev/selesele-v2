import type { PageTemplate } from '../../../../shared/kernel/library'

export const pageTemplates: PageTemplate[] = [
  { id: 'meeting', title: 'Meeting notes', icon: '📝', description: 'Agenda, decisions, and next steps.', content: '## Agenda\n\n- Topic\n\n## Notes\n\nWrite your notes here.\n\n## Decisions\n\n- Decision\n\n## Action items\n\n- [ ] Follow up\n' },
  { id: 'project', title: 'Project brief', icon: '🚀', description: 'Goals, scope, milestones, and ownership.', content: '## Overview\n\nWhat are we building, and why?\n\n## Goals\n\n- Goal\n\n## Scope\n\n### Included\n\n- Deliverable\n\n### Out of scope\n\n- Exclusion\n\n## Milestones\n\n- [ ] First milestone\n\n## Owners and risks\n\nWho is responsible? What could block progress?\n' },
  { id: 'sop', title: 'Standard operating procedure', icon: '📋', description: 'Repeatable steps and a completion checklist.', content: '## Purpose\n\nDescribe the expected outcome.\n\n## Responsibilities\n\nWho performs and reviews this procedure?\n\n## Prerequisites\n\n- Requirement\n\n## Procedure\n\n1. First step\n2. Next step\n\n## Checklist\n\n- [ ] Verify the outcome\n\n## Troubleshooting\n\nCommon issues and solutions.\n' },
  { id: 'documentation', title: 'Team documentation', icon: '📚', description: 'A shared reference for your team.', content: '## Overview\n\nExplain the topic.\n\n## Getting started\n\n1. First step\n\n## Examples\n\nAdd practical examples here.\n\n## Frequently asked questions\n\n### Question\n\nAnswer.\n\n## Related pages\n\nAdd links to other pages.\n' }
]
