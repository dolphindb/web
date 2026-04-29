import { register_script } from './index.ts'
import { execute_config } from './execute.ts'
import { coldefs_config } from './coldefs.ts'
import { testsql_config } from './testsql.ts'
import { show_config } from './show.ts'
import { doc_search_config } from './doc_search.ts'
import { doc_read_config } from './doc_read.ts'
import { skill_read_config } from './skill_read.ts'
import { skill_file_read_config } from './skill_file_read.ts'


export function init_scripts () {
    register_script(execute_config)
    register_script(coldefs_config)
    register_script(testsql_config)
    register_script(show_config)
    register_script(doc_search_config)
    register_script(doc_read_config)
    register_script(skill_read_config)
    register_script(skill_file_read_config)
}
