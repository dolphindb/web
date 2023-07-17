import { Model } from 'react-object-model'

import dayjs from 'dayjs'

import { debounce } from 'lodash'

import type { FitAddon } from 'xterm-addon-fit'

import type * as monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'

import { delta2str, assert } from 'xshell/utils.browser.js'
import { red, blue, underline } from 'xshell/chalk.browser.js'

import {
    DdbForm,
    DdbObj,
    DdbType,
    DdbFunctionType,
    type InspectOptions,
    type DdbVectorStringObj,
    type DdbTableObj,
    type DdbVectorInt,
    type DdbVectorLong,
} from 'dolphindb/browser.js'


import { t } from '../../i18n/index.js'

import { DdbObjRef } from '../obj.js'

import { model, NodeType, storage_keys } from '../model.js'

import type { Monaco } from './Editor/index.js'
import { Database, DatabaseGroup, type Column, type ColumnRoot, PartitionDirectory, type PartitionRoot, PartitionFile, Table } from './Databases.js'
import { DdbVar } from './Variables.js'


type Result = { type: 'object', data: DdbObj } | { type: 'objref', data: DdbObjRef }


class ShellModel extends Model<ShellModel> {
    term: import('xterm').Terminal
    
    fit_addon: FitAddon
    
    monaco: Monaco
    
    editor: monacoapi.editor.IStandaloneCodeEditor
    
    result: Result
    
    vars: DdbVar[]
    
    dbs: (Database | DatabaseGroup)[]
    
    options?: InspectOptions
    
    
    executing = false
    
    
    unload_registered = false
    
    load_table_schema_defined = false
    
    load_database_schema_defined = false
    
    peek_table_defined = false
    
    add_column_defined = false
    
    set_column_comment_defined = false
    
    
    current_node: ColumnRoot | Column
    
    
    set_column_comment_modal_visible = false
    
    create_database_modal_visible = false
    
    create_database_partition_count = 1
    
    
    /** 创建数据库的脚本 */
    generated_command: string
    
    confirm_command_modal_visible = false
    
    
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
            lines_.push('...')
        
        return lines_
    }
    
    
    async eval (code = this.editor.getValue()) {
        const time_start = dayjs()
        this.term.write(
            '\n' +
            time_start.format('YYYY.MM.DD HH:mm:ss.SSS') + '\n' + 
            (code.trim() ?
                this.truncate_text(code.split_lines()).join_lines()
            : '')
        )
        
        this.set({ executing: true })
        
        try {
            // TEST
            // throw new Error('xxxxx. RefId: S00001. xxxx RefId:S00002')
            
            let ddbobj = await model.ddb.eval(
                code.replaceAll('\r\n', '\n')
            )
            
            if (model.verbose)
                console.log('=>', ddbobj.toString())
            
            if (
                ddbobj.form === DdbForm.chart ||
                ddbobj.form === DdbForm.dict ||
                ddbobj.form === DdbForm.matrix ||
                ddbobj.form === DdbForm.set ||
                ddbobj.form === DdbForm.table ||
                ddbobj.form === DdbForm.vector
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
                            return blue(
                                ddbobj.inspect_type()
                            ) + '\n'
                        
                        default: {
                            if (ddbobj.type === DdbType.void)
                                return ''
                            
                            return ddbobj.toString({ ...this.options, colors: true, nullstr: true, quote: true }) + '\n'
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
                message = message.replaceAll(/RefId:\s*(\w+)/g, underline(blue('RefId: $1')))
            this.term.writeln(red(message))
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
                    options: this.options,
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
            
        let imutables = vars_data.filter(v => v.form === DdbForm.scalar || v.form === DdbForm.pair)
        
        if (imutables.length) {
            const { value: values } = await model.ddb.eval<DdbObj<DdbObj[]>>(
                `(${imutables.map(({ name }) => name).join(', ')}, 0)${model.ddb.python ? '.toddb()' : ''}`
            )
            
            for (let i = 0;  i < values.length - 1;  i++)
                imutables[i].obj = values[i]
        }
        
        
        this.set({
            vars: vars_data.map(data => 
                new DdbVar(data)
            )
        })
    }
    
    
    save (code = this.editor.getValue()) {
        localStorage.setItem(storage_keys.code, code)
    }
    
    save_debounced = debounce(this.save.bind(this), 500, { leading: false, trailing: true })
    
    
    async execute (default_selection: 'all' | 'line') {
        const { editor } = this
        
        const selection = editor.getSelection()
        const model = editor.getModel()
        
        if (selection.isEmpty())
            await this.eval(
                default_selection === 'line' ?
                    model.getLineContent(selection.startLineNumber)
                :
                    model.getValue(this.monaco.editor.EndOfLinePreference.LF)
            )
        else
            await this.eval(model.getValueInRange(selection, this.monaco.editor.EndOfLinePreference.LF))
        
        await this.update_vars()
    }
    
    
    async load_dbs () {
        // ['dfs://数据库路径(可能包含/)/表名', ...]
        // 不能直接使用 getClusterDFSDatabases, 因为新的数据库权限版本 (2.00.9) 之后，用户如果只有表的权限，调用 getClusterDFSDatabases 无法拿到该表对应的数据库
        // 但对于无数据表的数据库，仍然需要通过 getClusterDFSDatabases 来获取。因此要组合使用
        const [{ value: table_paths }, { value: db_paths }] = await Promise.all([
            model.ddb.call<DdbVectorStringObj>('getClusterDFSTables'),
            // 可能因为用户没有数据库的权限报错，单独 catch 并返回空数组
            model.ddb.call<DdbVectorStringObj>('getClusterDFSDatabases').catch(() => {
                console.error('load_dbs: getClusterDFSDatabases error')
                return { value: [ ] }
            }),
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
        let root: (Database | DatabaseGroup)[] = [ ]
        for (const path of merged_paths) {
            // 找到数据库最后一个斜杠位置，截取前面部分的字符串作为库名
            const index_slash = path.lastIndexOf('/')
            
            const db_path = `${path.slice(0, index_slash)}/`
            const table_name = path.slice(index_slash + 1)
            
            let parent: Database | DatabaseGroup | { children: (Database | DatabaseGroup)[] } = { children: root }
            
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
            
            // 处理 table，如果 table_name 为空表明当前路径是 db_path 则不处理
            if (table_name) {
                const table = new Table(parent as Database, `${path}/`)
                parent.children.push(table)
            }
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
        const {
            rows,
            value: [{ value: filenames }, { value: filetypes }, /* sizes */, { value: chunks_column }, { value: sites }]
        } = await model.ddb.call<
            DdbTableObj<[DdbVectorStringObj, DdbVectorInt, DdbVectorLong, DdbVectorStringObj, DdbVectorStringObj]>
        >(
            // 函数要在 controller (且是 leader) 上调用
            'getDFSDirectoryContent',
            [node.path.slice('dfs:/'.length)],
            model.node.mode !== NodeType.controller ? { node: model.controller_alias, func_type: DdbFunctionType.SystemFunc } : { }
        )
        
        let directories: PartitionDirectory[] = [ ]
        let file: PartitionFile
        
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
                        site_node !== model.node_alias ? { node: site_node, func_type: DdbFunctionType.SystemFunc } : { }
                    )
                    
                    // 可能是空的数据库，里面还没有表，也没有数据
                    if (!tables.length)
                        return [ ]
                    
                    assert(tables.length === 1, t('getTablesByTabletChunk 应该只返回一个对应的 table'))
                    
                    if (tables[0] === node.root.table.name) {
                        assert(!file, t('应该只有一个满足条件的 PartitionFile 在 PartitionDirectory 下面'))
                        file = new PartitionFile(root, node, `${node.path}${filenames[i]}`, chunk, site_node)
                        
                        i = rows // break
                    }
                    
                    break
                }
            }
        
        // directories 和 files 中应该只有一个有值，另一个为空
        if (directories.length) {
            assert(!file, t('directories 和 file 应该只有一个有值，另一个为空'))
            return directories
        } else if (file) {
            assert(!directories.length, t('directories 和 file 应该只有一个有值，另一个为空'))
            return [file]
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
