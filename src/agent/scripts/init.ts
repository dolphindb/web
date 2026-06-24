import { register_script } from './index.ts'
import { execute_config } from './execute.ts'
import { coldefs_config } from './coldefs.ts'
import { testsql_config } from './testsql.ts'
import { show_config } from './show.ts'
import { doc_search_config } from './doc_search.ts'
import { doc_read_config } from './doc_read.ts'
import { skill_read_config } from './skill_read.ts'
import {
    execute_file_config,
    step_clear_config,
    step_create_config,
    step_update_config,
    vfs_copy_config,
    vfs_create_config,
    vfs_delete_config,
    vfs_list_config,
    vfs_read_config,
    vfs_search_config,
    vfs_update_config,
    workspace_state_read_config,
    workspace_state_update_config,
} from './workspace_tools.ts'


export function init_scripts () {
    register_script(execute_config)
    register_script(coldefs_config)
    register_script(testsql_config)
    register_script(show_config)
    register_script(doc_search_config)
    register_script(doc_read_config)
    register_script(skill_read_config)
    register_script(vfs_list_config)
    register_script(vfs_create_config)
    register_script(vfs_read_config)
    register_script(vfs_search_config)
    register_script(vfs_update_config)
    register_script(vfs_delete_config)
    register_script(vfs_copy_config)
    register_script(execute_file_config)
    register_script(step_create_config)
    register_script(step_update_config)
    register_script(step_clear_config)
    register_script(workspace_state_read_config)
    register_script(workspace_state_update_config)
}
