import { model } from '@model'

import dolphindb from '@/icons/logos/dolphindb.svg'
import dolphinx from '@/icons/logos/dolphinx.svg'
import iotbasic from '@/icons/logos/iotbasic.svg'
import iotpro from '@/icons/logos/iotpro.svg'
import octopus from '@/icons/logos/octopus.svg'
import orca from '@/icons/logos/orca.svg'
import shark from '@/icons/logos/shark.svg'
import swordfish from '@/icons/logos/swordfish.svg'

import dolphindb_shf from '@/icons/logos/dolphindb.shf.svg'
import dolphindb_color from '@/icons/logos/dolphindb.color.svg'


export function Logo ({ header }: { header: boolean }) {
    const { shf, product } = model.use(['shf', 'product'])
    
    return <div className='logo'>
        <img className='dolphindb' src={shf ? dolphindb_shf : header ? dolphindb : dolphindb_color } />
        { product !== 'dolphindb' && <>
            <div className='line'>|</div>
            <img
                className='suffix'
                src={logos[product]}
                style={ (shf || !header) ? { filter: 'invert(100%)' } : undefined } />
        </> }
    </div>
}


const logos = {
    dolphindb,
    dolphinx,
    iotbasic,
    iotpro,
    octopus,
    orca,
    shark,
    swordfish
}
