import { Model } from 'react-object-model'

import dayjs from 'dayjs'

import { debounce } from 'lodash'

import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'

import type * as monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'

import { delta2str, assert, delay, strcmp } from 'xshell/utils.browser.js'
import { red, blue } from 'xshell/chalk.browser.js'

import {
    DdbForm, SqlStandard, type DdbObj, DdbType, type DdbVectorStringObj, type DdbTableObj,
    type DdbVectorInt, type DdbVectorLong, 
} from 'dolphindb/browser.js'


import { t } from '@i18n/index.js'

import { type DdbObjRef } from '@/obj.js'

import { model, NodeType, storage_keys } from '@/model.js'

import type { Monaco } from '@/components/Editor/index.js'

import { Database, DatabaseGroup, type Column, type ColumnRoot, PartitionDirectory, type PartitionRoot, PartitionFile, type Table, Catalog } from './Databases.js'

import { DdbVar } from './Variables.js'


type Result = { type: 'object', data: DdbObj } | { type: 'objref', data: DdbObjRef }


class ShellModel extends Model<ShellModel> {
    term: Terminal
    
    fit_addon: FitAddon
    
    monaco: Monaco
    
    editor: monacoapi.editor.IStandaloneCodeEditor
    
    result: Result
    
    vars: DdbVar[]
    
    dbs: (Catalog | Database | DatabaseGroup)[]
    
    
    executing = false
    
    show_executing = false
    
    unload_registered = false
    
    load_table_schema_defined = false
    
    load_table_variable_schema_defined = false
    
    load_database_schema_defined = false
    
    get_access_defined = false
    
    peek_table_defined = false
    
    add_column_defined = false
    
    set_column_comment_defined = false
    
    set_table_comment_defined = false
    
    get_csv_content_defined = false
    
    current_node: ColumnRoot | Column | Table
    
    set_column_comment_modal_visible = false
    
    set_table_comment_modal_visible = false
    
    create_database_modal_visible = false
    
    create_catalog_modal_visible = false
    
    create_database_partition_count = 1
    
    
    /** 创建数据库的脚本 */
    generated_command: string
    
    confirm_command_modal_visible = false
    
    /** 当前打开的 tab */
    itab = -1
    
    /** 所有的 tabs */
    tabs: Tab[] = [ ]
    
    monaco_inited = false
    
    
    truncate_text (lines: string[]) {
        let i_first_non_empty = null
        let i_non_empty_end = null
        for (let i = 0;  i < lines.length;  i++) 
            if (lines[i].trim()) {
                if (i_first_non_empty === null)
                    i_first_non_empty = i
                i_non_empty_end = i + 1
            }
        
        // 未找到非空行
        if (i_first_non_empty === null) {
            i_first_non_empty = 0
            i_non_empty_end = 0
        }
        
        const too_much = i_non_empty_end - i_first_non_empty > 3
        
        let lines_ = lines.slice(i_first_non_empty, too_much ? i_first_non_empty + 2 : i_non_empty_end)
        if (too_much)
            lines_.push(t('··· 共 {{total_lines}} 行 ···', { total_lines: i_non_empty_end - i_first_non_empty }))
        
        return lines_
    }
    
    
    async refresh_db () {
        
    }
    
    
    async refresh_vars () {
        
    }
    
    
    async eval (code = this.editor.getValue(), istart: number) {
        const time_start = dayjs()
        const lines = code.split_lines()
        
        this.term.write(
            '\n' +
            time_start.format('HH:mm:ss.SSS') + '\n' + 
            (code.trim() ?
                this.truncate_text(lines).join_lines()
            : '')
        )
        
        this.set({ executing: true })
        
        try {
            // TEST
            // throw new Error('xxxxx. RefId: S00001. xxxx RefId:S00002')
            
            let ddbobj = await model.ddb.eval(
                `line://${istart}\n` +
                `${code.replaceAll('\r\n', '\n')}`
            )
            
            if (model.dev || model.verbose)
                console.log('执行代码返回了:', ddbobj.data())
            
            if (
                ddbobj.form === DdbForm.chart ||
                ddbobj.form === DdbForm.dict ||
                ddbobj.form === DdbForm.matrix ||
                ddbobj.form === DdbForm.set ||
                ddbobj.form === DdbForm.table ||
                ddbobj.form === DdbForm.vector ||
                ddbobj.form === DdbForm.tensor
            )
                this.set({
                    result: {
                        type: 'object',
                        data: ddbobj
                    },
                })
            
            this.term.writeln(
                (() => {
                    switch (ddbobj.form) {
                        case DdbForm.chart:
                        case DdbForm.dict:
                        case DdbForm.matrix:
                        case DdbForm.set:
                        case DdbForm.table:
                        case DdbForm.vector:
                        case DdbForm.tensor:
                            return blue(
                                ddbobj.inspect_type()
                            ) + '\n'
                        
                        default: {
                            if (ddbobj.type === DdbType.void)
                                return ''
                            
                            return ddbobj.toString({ ...model.options, colors: true, nullstr: true, quote: true }) + '\n'
                        }
                    }
                })() +
                `(${delta2str(
                    dayjs().diff(time_start)
                )})`
            )
        } catch (error) {
            let message = error.message as string
            if (message.includes('RefId:'))
                message = message.replaceAll(/RefId:\s*(\w+)/g, (_, ref_id) =>
                    // xterm link写法 https://stackoverflow.com/questions/64759060/how-to-create-links-in-xterm-js
                    blue(`\x1b]8;;${model.get_error_code_doc_link(ref_id)}\x07RefId: ${ref_id}\x1b]8;;\x07`)
                )
                
            
            this.term.writeln(red(message))
            
            console.log(error)
            
            throw error
        } finally {
            this.set({ executing: false })
        }
    }
    
    
    async update_vars () {
        let objs = await model.ddb.call('objs', [true])
        
        const vars_data = objs
            .to_rows()
            .map(
                ({
                    name,
                    type,
                    form,
                    rows,
                    columns,
                    bytes,
                    shared,
                    extra
                }: {
                    name: string
                    type: string
                    form: string
                    rows: number
                    columns: number
                    bytes: bigint
                    shared: boolean
                    extra: string
                }) => ({
                    name,
                    type: (() => {
                        const _type = type.toLowerCase()
                        return _type.endsWith('[]') ? DdbType[_type.slice(0, -2)] + 64 : DdbType[_type]
                    })(),
                    form: (() => {
                        const _form = form.toLowerCase()
                        switch (_form) {
                            case 'dictionary':
                                return DdbForm.dict
                                
                            case 'sysobj':
                                return DdbForm.object
                                
                            default:
                                return DdbForm[_form]
                        }
                    })(),
                    rows,
                    cols: columns,
                    bytes,
                    shared,
                    extra,
                    obj: undefined as DdbObj,
                    options: model.options,
                })
            )
            .filter(
                v =>
                    v.name !== 'pnode_run' &&
                    !(
                        v.form === DdbForm.object &&
                        (v.name === 'list' || v.name === 'tuple' || v.name === 'dict' || v.name === 'set' || v.name === '_ddb')
                    )
            )
            
        let immutables = vars_data.filter(v => v.form === DdbForm.scalar || v.form === DdbForm.pair)
        
        if (immutables.length) {
            const { value: values } = await model.ddb.eval<DdbObj<DdbObj[]>>(
                `(${immutables.map(({ name }) => name).join(', ')}, 0)${model.ddb.python ? '.toddb()' : ''}`
            )
            
            for (let i = 0;  i < values.length - 1;  i++) {
                immutables[i].obj = values[i]
                
                // 此处需要用变量值的类型来替换 objs(true) 中获取的变量的类型，因为当变量类型为 string 且变量值很长时，server 返回的变量值的类型是 blob
                immutables[i].type = values[i].type
            }  
        }
        
        
        this.set({
            vars: vars_data.map(data => 
                new DdbVar(data)
            )
        })
    }
    
    
    save (code = this.editor?.getValue()) {
        if (code === undefined) 
            throw new Error('不能保存 undefined 的 code')
        
        if (this.itab > -1) {
            let tab = this.tabs.find(t => t.index === this.itab)
            if (tab)
                tab.code = code
            this.set({ tabs: [...this.tabs] })
            try {
                localStorage.setItem(`${storage_keys.code}.${this.itab}`, JSON.stringify(tab))
            } catch (error) {
                model.modal.error({ title: t('代码存储失败，请检查代码大小或本地存储空间剩余空间'), content: error.message })
                this.remove_tab(this.itab)
                error.shown = true
                throw error
            }
        } else
            localStorage.setItem(storage_keys.code, code)
    }
    
    
    remove_tab (tab_index: number) {
        this.set({ tabs: this.tabs.filter(t => t.index !== tab_index) })
        localStorage.removeItem(`${storage_keys.code}.${tab_index}`)
    }
    
    remove_git_tabs () {
        const tabs_with_git = this.tabs.filter(t => t.git)
        const tabs_with_git_indexies = tabs_with_git.map(t => t.index)
        this.set({ tabs: this.tabs.filter(t => !t.git) })
        this.switch_tab(-1)
        for (const key of tabs_with_git_indexies)
            localStorage.removeItem(`${storage_keys.code}.${key}`)
    }
    
    
    add_tab () {
        if (!this.monaco_inited)
            return
        
        this.save()
        const index_set = new Set(this.tabs.map(t => t.index))
        let new_tab_index = 1
        while (index_set.has(new_tab_index))
            new_tab_index++
        const new_tab_name = t('标签页 ') + new_tab_index
        this.set({
            itab: new_tab_index,
            tabs: [...this.tabs, { name: new_tab_name, code: '', index: new_tab_index }]
        })
        
        this.editor.setValue('')
    }
    
    add_git_tab (
        file_path: string,
        file_name: string,
        code: string,
        {
            repo_id,
            repo_path, 
            repo_name, 
            branch = 'main', 
            sha, 
            is_history = false, 
            commit_id
        }: {
            repo_id: string
            repo_path: string
            repo_name: string
            branch: string
            sha: string
            commit_id: string
            is_history?: boolean
        },
    ) {
        if (!this.monaco_inited)
            return
        
        // 检查是否存在当前仓库和当前分支的文件，否则只是跳转过去
        const index = this.tabs.findIndex(t => t.git?.repo_id === repo_id && t.git?.branch === branch && t.git?.file_path === file_path)
        if (index > -1 && !is_history) {
            const tab = this.tabs[index]
            this.switch_tab(tab.index)
            return
        }
        
        this.save()
        const index_set = new Set(this.tabs.map(t => t.index))
        let new_tab_index = 1
        while (index_set.has(new_tab_index))
            new_tab_index++
            
        const new_tab_name = file_name
        this.set({
            itab: new_tab_index,
            tabs: [...this.tabs, {
                name: new_tab_name,
                code,
                index: new_tab_index,
                read_only: is_history,
                git: { repo_id, repo_path, repo_name, branch, file_path, file_name, raw_code: code, sha, commit_id }
            }]
        })
        
        this.editor.setValue(code)
    }
    
    update_git_tab_code (index: number, code: string, commit_id: string, sha: string) {
        const tab = this.tabs.find(t => t.index === index)
        if (!tab || !tab.git)
            return
        
        tab.git.raw_code = code
        tab.code = code
        if (sha)
            tab.git.sha = sha
        if (commit_id)
            tab.git.commit_id = commit_id
        if (this.itab === index)
            this.editor.setValue(code)
        this.set({ tabs: [...this.tabs] })
        this.save()
    }
    
    
    switch_tab (tab_index: number) {
        if (!this.monaco_inited)
            return
        
        this.save()
        this.set({ itab: tab_index })
        if (tab_index > -1)
            this.editor.setValue(this.tabs.find(t => t.index === tab_index)?.code || '')
        else
            this.editor.setValue(localStorage.getItem(`${storage_keys.code}`) || '')
    }
    
    
    init_tabs () {
        const tab_keys = Object.keys(localStorage)
            .filter(key => key.startsWith(`${storage_keys.code}.`))
        
        let tabs: Tab[] = [ ]
        
        for (const key of tab_keys) 
            try {
                tabs.push(
                    JSON.parse(localStorage.getItem(key) || '')
                )
            } catch (error) {
                localStorage.removeItem(key)
            }
        
        this.set({ tabs: tabs.sort((a, b) => a.index - b.index) })
    }
    
    
    save_debounced = debounce(this.save.bind(this), 500, { leading: false, trailing: true })
    
    
    async execute (default_selection: 'all' | 'line') {
        const { editor } = this
        
        const selection = editor.getSelection()
        const emodel = editor.getModel()
        let code: string
        let istart: number
        
        if (selection.isEmpty()) {
            code = default_selection === 'line' ?
                emodel.getLineContent(selection.startLineNumber)
            :
                emodel.getValue(this.monaco.editor.EndOfLinePreference.LF)
            istart = default_selection === 'line' ? selection.startLineNumber : 1
        } else {
            code = emodel.getValueInRange(selection, this.monaco.editor.EndOfLinePreference.LF)
            istart = selection.startLineNumber
        }
        
        if (code.includes('undef all') || code.includes('undef(all)'))
            if (await model.modal.confirm({ content: t('执行 undef all 会导致 web 部分功能不可用，执行完成后需要刷新才能恢复, 确定执行吗？') }))
                try {
                    await this.eval(code, istart)
                } finally {
                    model.modal.warning({
                        content: t('执行 undef all 后需要刷新以恢复 web 功能'),
                        onOk: () => { location.reload() },
                        okText: t('立即刷新')
                    })
                }
             else
                return
         else
            await this.eval(code, istart)
        
        if (code.includes('login') || code.includes('logout') || code.includes('authenticateByTicket'))
            await model.update_user()
        
        // 执行了 logout 之后，跳转到登录页
        if (!model.logined && (model.login_required || model.client_auth)) {
            await model.goto_login()
            
            // 在启用了 client_auth 的情况下不调用 objs() 避免报错
            return
        }
        
        await this.update_vars()
    }
    
    
    async execute_ (default_selection: 'all' | 'line') {
        let done = false
        const show_delay = delay(500)
        ;(async () => {
            await show_delay
            if (!done)
                this.set({ show_executing: true })
        })()
        
        try {
            await shell.execute(default_selection)
        } finally {
            done = true
            this.set({ show_executing: false })
        }
    }
    
    
    async load_dbs () {
        await model.get_cluster_perf(false)
        
        const { v3, ddb } = model
        
        // 当前无数据节点存活，且当前节点不为单机节点，则不进行数据库表获取
        if (model.node.mode !== NodeType.single && !model.has_data_nodes_alive()) 
            return
        
        // ['dfs://数据库路径(可能包含/)/表名', ...]
        // 不能直接使用 getClusterDFSDatabases, 因为新的数据库权限版本 (2.00.9) 之后，用户如果只有表的权限，调用 getClusterDFSDatabases 无法拿到该表对应的数据库
        // 但对于无数据表的数据库，仍然需要通过 getClusterDFSDatabases 来获取。因此要组合使用
        const [{ value: table_paths }, { value: db_paths }, ...rest] = await Promise.all([
            ddb.call<DdbVectorStringObj>('getClusterDFSTables'),
            // 可能因为用户没有数据库的权限报错，单独 catch 并返回空数组
            ddb.call<DdbVectorStringObj>('getClusterDFSDatabases').catch(() => {
                console.error('load_dbs: getClusterDFSDatabases error')
                return { value: [ ] }
            }),
            ...v3 ? [ddb.call<DdbVectorStringObj>('getAllCatalogs')] : [ ],
        ])
        
        // const db_paths = [
        //     'dfs://db1',
        //     'dfs://g1.db1',
        //     'dfs://g1.db2',
        //     'dfs://g1./db1',
        // ...]
        
        // const table_paths = [
        //     'dfs://db1/tb1',
        //     'dfs://g1.db1/tb1',
        //     'dfs://g1.db1/tb.2',
        //     'dfs://g1./db1/tb2',
        //     'dfs://long.g1.sg1.ssg1.sssg1.db1/tb1',
        //     // 即使有两个连续点号，也不进行任何特殊处理。用户在界面上看到的将会有一个 group 的标题为空
        //     'dfs://double-dot..g1/db1/tb',
        //     'dfs://double-dot..g1.sg1.db1/tb',
        //     'dfs://double-dot..g1.sg2.db1/tb',
        //     'dfs://db-with-slash/db1/tb1',
        //     'dfs://group_with_slash/g1.sg1.db1/tb1'
        // ]
        
        // 将 db_paths 和 table_paths 合并到 merged_paths 中。db_paths 内可能存在 table_paths 中没有的 db，例如能查到无表的库
        // 需要手动为 db_paths 中的每个路径加上斜杠结尾
        const merged_paths = db_paths.map(path => `${path}/`).concat(table_paths).sort()
        
        // 假定所有的 table_name 值都不会以 / 结尾
        // 库和表之间以最后一个 / 隔开。表名不可能有 /
        // 全路径中可能没有组（也就是没有点号），但一定有库和表
        let hash_map = new Map<string, Database | DatabaseGroup>()
        let catalog_map = new Map<string, Database>()
        let root: (Catalog | Database | DatabaseGroup)[] = [ ]
        
        if (v3) 
            await Promise.all(rest[0].value.sort().map(async catalog => {
                let catalog_node = new Catalog(catalog)
                root.push(catalog_node)
                
                ;(
                    await ddb.invoke('getSchemaByCatalog', [catalog])
                ).data
                    .sort((a, b) => strcmp(a.schema, b.schema))
                    .map(({ schema, dbUrl }) => {
                        const db_path = `${dbUrl}/`
                        const database = new Database(db_path, schema)
                        catalog_map.set(db_path, database)
                        catalog_node.children.push(database)
                    })
            }))
        
        for (const path of merged_paths) {
            // 找到数据库最后一个斜杠位置，截取前面部分的字符串作为库名
            const index_slash = path.lastIndexOf('/')
            
            const db_path = `${path.slice(0, index_slash)}/`
            const table_name = path.slice(index_slash + 1)
            
            let parent: Catalog | Database | DatabaseGroup | { children: (Catalog | Database | DatabaseGroup)[] } = { children: root }
            
            if (catalog_map.has(db_path)) 
                parent = catalog_map.get(db_path)
            else {
                // for 循环用来处理 database group
                for (let index = 0;  index = db_path.indexOf('.', index) + 1;  ) {
                    const group_key = path.slice(0, index)
                    const group = hash_map.get(group_key)
                    if (group)
                        parent = group
                    else {
                        const group = new DatabaseGroup(group_key)
                        ;(parent as DatabaseGroup).children.push(group)
                        hash_map.set(group_key, group)
                        parent = group
                    }
                }
                
                // 处理 database
                const db = hash_map.get(db_path) as Database
                if (db)
                    parent = db
                else {
                    const db = new Database(db_path)
                    ;(parent as DatabaseGroup).children.push(db)
                    hash_map.set(db_path, db)
                    parent = db
                }
            }
            
            // 处理 table，如果 table_name 为空表明当前路径是 db_path 则不处理
            if (table_name) 
                parent.table_paths.push(`${path}/`)
            
        }
        
        // TEST: 测试多级数据库树
        // for (let i = 0;  i <100 ;  i++) {
        //     for (let j =0; j< 500; j++){
        //         const path = `dfs://${i}.${j}`
        //         const tables = [new TableEntity({name: `table_of_${i}_${j}`, ddb_path:path, labels:['sdsadfs'], column_schema:[{name:'Id', type:5}]})]
        //         dbs.set(path, new DdbEntity({ path ,tables}))
        //     }
        //  }
        
        this.set({ dbs: root })
    }
    
    
    /** - path: 类似 dfs://Crypto_TSDB_14/, dfs://Crypto_TSDB_14/20100101_20110101/ 的路径 */
    async load_partitions (root: PartitionRoot, node: PartitionDirectory | PartitionRoot) {
        // 之前 table.load_children 时一定已经加载了 schema
        const { schema } = root.table
        
        const is_database_granularity = schema.to_dict().chunkGranularity.value === 'DATABASE'
        
        const {
            rows,
            value: [{ value: filenames }, { value: filetypes }, /* sizes */, { value: chunks_column }, { value: sites }]
        } = await model.ddb.call<
            DdbTableObj<[DdbVectorStringObj, DdbVectorInt, DdbVectorLong, DdbVectorStringObj, DdbVectorStringObj]>
        >(
            // 函数要在 controller (且是 leader) 上调用
            'getDFSDirectoryContent',
            [node.path.slice('dfs:/'.length)],
            model.node.mode !== NodeType.controller ? { node: model.controller_alias } : undefined
        )
        
        let directories: PartitionDirectory[] = [ ]
        let files: PartitionFile[] = [ ]
        
        for (let i = 0;  i < rows;  i++)
            switch (filetypes[i]) {
                case DfsFileType.directory:
                    directories.push(
                        new PartitionDirectory(root, node, `${node.path}${filenames[i]}/`)
                    )
                    break
                
                case DfsFileType.file_partition: {
                    const chunks = chunks_column[i].split(',')
                    assert(chunks.length === 1, 'chunks.length === 1')
                    const chunk = chunks[0]
                    
                    // 这里假定对应的 sites 字段一定不是空字符串
                    const site_node = sites[i].split(',')[0].split(':')[0]
                    assert(site_node, t('sites 中应该有存放 chunk 所在节点的信息'))
                    
                    const { value: tables } = await model.ddb.call<DdbVectorStringObj>(
                        'getTablesByTabletChunk',
                        [chunk],
                        // sites 字段里面的就是 node_alias
                        site_node !== model.node_alias ? { node: site_node } : undefined
                    )
                    
                    // 可能是空的数据库，里面还没有表，也没有数据
                    if (!tables.length)
                        return [ ]
                    
                    if (is_database_granularity)  // directory 下面的每个 partition file 代表一个分区
                        files.push(new PartitionFile(root, node, `${node.path}${filenames[i]}`, chunk, site_node, filenames[i]))
                    else if (tables[0] === node.root.table.name) {
                        assert(tables.length === 1, t('getTablesByTabletChunk 应该只返回一个对应的 table'))
                        assert(files.length === 0, t('应该只有一个满足条件的 PartitionFile 在 PartitionDirectory 下面'))
                        files.push(new PartitionFile(root, node, `${node.path}${filenames[i]}`, chunk, site_node))
                        
                        i = rows // break
                        break
                    }
                }
            }
        
        // directories 和 files 中应该只有一个有值，另一个为空
        if (directories.length) {
            assert(!files.length, t('directories 和 file 应该只有一个有值，另一个为空'))
            return directories
        } else if (files.length) {
            assert(!directories.length, t('directories 和 file 应该只有一个有值，另一个为空'))
            return files
        } else
            return [ ]
    }
    
    
    async define_load_table_schema () {
        if (this.load_table_schema_defined)
            return
        
        await model.ddb.eval(
            'def load_table_schema (db_path, tb_name) {\n' +
            '    return schema(loadTable(db_path, tb_name))\n' +
            '}\n'
        )
        
        shell.set({ load_table_schema_defined: true })
    }
    
    
    async define_load_table_variable_schema () {
        if (this.load_table_variable_schema_defined)
            return
        
        await model.ddb.eval(
            'def load_table_variable_schema (tb_name) {\n' +
            '    return schema(objByName(tb_name))\n' +
            '}\n'
        )
        
        shell.set({ load_table_variable_schema_defined: true })
    }
    
    
    async define_load_database_schema () {
        if (this.load_database_schema_defined)
            return
        
        await model.ddb.eval(
            'def load_database_schema (db_path) {\n' +
            '    return schema(database(db_path))\n' +
            '}\n'
        )
        
        shell.set({ load_database_schema_defined: true })
    }
    
    
    async define_peek_table () {
        if (this.peek_table_defined)
            return
        
        await model.ddb.eval(
            'def peek_table (db_path, tb_name) {\n' +
            '    return select top 100 * from loadTable(db_path, tb_name)\n' +
            '}\n'
        )
        
        shell.set({ peek_table_defined: true })
    }
    
    
    async define_add_column () {
        if (this.add_column_defined)
            return
        
        await model.ddb.eval(
            'def add_column (db_path, tb_name, col_name, col_type_str) {\n' +
            // addColumn 的最后一个参数不能是 'INT', 只能是 INT 或者对应的 typeInt 4
            // https://www.dolphindb.cn/cn/help/DatabaseandDistributedComputing/DatabaseOperations/AddColumns.html?highlight=addcolumn
            // https://www.dolphindb.cn/cn/help/FunctionsandCommands/CommandsReferences/a/addColumn.html
            '    addColumn(loadTable(database(db_path), tb_name), col_name, eval(parseExpr(col_type_str)) )\n' + 
            '}\n'
        )
        
        shell.set({ add_column_defined: true })
    }
    
    
    async define_set_column_comment () {
        if (this.set_column_comment_defined)
            return
        
        await model.ddb.eval(
            'def set_column_comment (db_path, tb_name, col_name, col_comment) {\n' +
            // setColumnComment 的最后一个参数是动态的字典，因此用 dict 来构造
            '    setColumnComment(loadTable(database(db_path), tb_name), dict([col_name], [col_comment]))\n' +
            '}\n'
        )
        
        shell.set({ set_column_comment_defined: true })
    }
    
    
    async define_get_csv_content () {
        if (!this.get_csv_content_defined) {
            await model.ddb.eval(
                'def get_csv_content (name_or_obj, start, end) {\n' +
                '    type = typestr name_or_obj\n' +
                // oracle 或运算符为 or
                `    if (type =='CHAR' ${model.sql === SqlStandard.Oracle ? 'or' : '||'} type =='STRING')\n` +
                '        obj = objByName(name_or_obj)\n' +
                '    else\n' +
                '        obj = name_or_obj\n' +
                // char(44) 构造一个逗号
                '    return generateTextFromTable(select * from obj, start, end - start + 1, 0, char(44), true)\n' +
                '}\n'
            )
            
            this.set({ get_csv_content_defined: true })
        }
    }
    
    async define_set_table_comment () {
        if (!this.set_table_comment_defined) {
            await model.ddb.execute(
                'def set_table_comment (db_path, tb_name, table_comment) {\n' +
                '    setTableComment(loadTable(database(db_path), tb_name), table_comment)\n' +
                '}\n'
            )
            
            shell.set({ set_table_comment_defined: true })
        }
    }
    
    
    async define_get_user_grant () {
        if (this.get_access_defined)
            return
        await model.ddb.eval(
            'def getUserGrant(name) {\n' +
            '    userAccessRow = getUserAccess(getUserList(),true)\n' +
            '    t = table(100:0, `userId`AccessAction, [STRING, SYMBOL])\n' +
            '    if(rows(userAccessRow)==0)return t\n' +
            '    for(action in `DB_MANAGE`DBOBJ_CREATE`DBOBJ_DELETE`DB_INSERT`DB_UPDATE`DB_DELETE`DB_READ`TABLE_READ`TABLE_INSERT`TABLE_UPDATE`TABLE_DELETE) {\n' +
            '       for(user in userAccessRow){\n' +
            '           accItems = user[action + "_allowed"].split(",").flatten()\n' +
            '           tablePath = accItems[accItems == name]\n' +
            '           tablePath.size()\n' +
            '           t.tableInsert( take(user.userId, tablePath.size()), take(action, tablePath.size()))\n' +
            '       }\n' +
            '    }\n' +
            '    return t\n' +
            '}\n'
        )
        this.set({ get_access_defined: true })
    }
}


export interface Tab {
    index: number
    name: string
    code: string
    read_only?: boolean
    git?: {
        repo_id: string
        repo_path: string
        repo_name: string
        branch: string
        file_path: string
        file_name: string
        raw_code: string
        sha: string
        commit_id: string
    }
}


enum DfsFileType {
    /** 分区文件夹 (NORMAL_DIR) */
    directory,
    
    PARTITION_DIRV0,
    
    NORMAL_FILEV0,
    
    SMALLFILE_DIR,
    
    /** 分区文件 chunk (PARTITION_DIR) */
    file_partition,
    
    /** 如 domain, table.tbl, ... 等文件 (NORMAL_FILE) */
    file_normal
}



export let shell = window.shell = new ShellModel()
