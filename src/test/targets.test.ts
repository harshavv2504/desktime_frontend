import {describe,it,expect} from 'vitest';
import {employeeTargets} from '../TargetOverview';
import type {Attendance} from '../types';
const row=(id:string,required:number,credited:number)=>({employee_id:id,employee_name:id,required,credited} as Attendance);
describe('Employee daily targets',()=>{
 it('does not let overtime cancel another day shortfall',()=>{const [p]=employeeTargets([row('a',28800,36000),row('a',28800,20000)]);expect(p.remaining).toBe(8800);expect(p.unmetDays).toBe(1);});
 it('uses each employee target and orders largest shortfall first',()=>{const p=employeeTargets([row('consultant',7200,7200),row('fulltime',28800,7200),row('unset',0,100)]);expect(p[0].id).toBe('fulltime');expect(p.find(r=>r.id==='consultant')?.remaining).toBe(0);expect(p.find(r=>r.id==='unset')?.days).toBe(0);});
});
