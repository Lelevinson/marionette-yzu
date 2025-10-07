import { type Playbook } from './types'
import { searchPlaybook } from './search'
import { emailPlaybook } from './email'
import { formPlaybook } from './form'

export const PLAYBOOKS: Playbook[] = [
  searchPlaybook,
  emailPlaybook,
  formPlaybook
]

export function generatePlaybooksDocumentation(): string {
  return '## Available Playbooks\n\n' + PLAYBOOKS.map(playbook => `- **${playbook.id}**: ${playbook.description}`).join('\n')
}

export function getPlaybookById(id: string): Playbook | null {
  return PLAYBOOKS.find(p => p.id === id) || null
}

export { type Playbook } from './types'
