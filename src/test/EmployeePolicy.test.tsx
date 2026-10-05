import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import EmployeePolicyEditor from '../EmployeePolicyEditor';
import type {Device,Policy} from '../types';
const company={work_start:'09:00',work_end:'18:45',work_days:[0,1,2,3,4],minimum_minutes:480} as Policy;
const device={employee_id:'C1',employee_name:'Consultant'} as Device;
it('saves an explicit manager-approved flexible consultant target',async()=>{
 const save=vi.fn().mockResolvedValue({});render(<EmployeePolicyEditor device={device} company={company} save={save}/>);
 fireEvent.change(screen.getByLabelText('Policy source'),{target:{value:'override'}});
 fireEvent.change(screen.getByLabelText('Work arrangement'),{target:{value:'consultant'}});
 fireEvent.change(screen.getByLabelText('Required productive hours per day'),{target:{value:'2'}});
 fireEvent.change(screen.getByLabelText('Schedule'),{target:{value:'flexible'}});
 fireEvent.click(screen.getByRole('button',{name:'Approve & save work policy'}));
 await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({employee_id:'C1',minimum_minutes:120,schedule_mode:'flexible',arrangement:'consultant',work_days:[0,1,2,3,4]})));
});
it('restores company inheritance without stale overrides',async()=>{
 const save=vi.fn().mockResolvedValue({});render(<EmployeePolicyEditor device={{...device,work_policy:{...company,inherited:false}}} company={company} save={save}/>);
 fireEvent.change(screen.getByLabelText('Policy source'),{target:{value:'company'}});
 fireEvent.click(screen.getByRole('button',{name:'Approve & save work policy'}));
 await waitFor(()=>expect(save).toHaveBeenCalledWith({employee_id:'C1',inherit:true}));
});

it('disables unchanged and reverted employee policy',()=>{
 render(<EmployeePolicyEditor device={device} company={company} save={vi.fn()}/>);
 const button=screen.getByRole('button',{name:'Approve & save work policy'});
 expect(button).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Policy source'),{target:{value:'override'}});
 expect(button).toBeEnabled();
 fireEvent.change(screen.getByLabelText('Policy source'),{target:{value:'company'}});
 expect(button).toBeDisabled();
});
