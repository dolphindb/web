import { storage_keys } from '@/model.ts'

import { GitHubAdapter, GitLabAdapter } from './git-adapter.ts'

export const git_provider = localStorage.getItem(storage_keys.git_provider) === 'github' ? new GitHubAdapter() : new GitLabAdapter()
export function getToken () {
    return localStorage.getItem(storage_keys.git_access_token)
}
