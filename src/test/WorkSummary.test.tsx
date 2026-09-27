import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import WorkSummary from '../WorkSummary';
import ClassificationEditor from '../ClassificationEditor';
import type {Attendance} from '../types';

it('uses summed denominators for team productivity and handles no data',()=>{
  const rows=[{active:3600,productive:1800,required:7200},{active:10800,productive:10800,required:14400}] as Attendance[];
  render(<WorkSummary rows={rows}/>);
  expect(screen.getByText('87.5%')).toBeInTheDocument();
  expect(screen.getByText('58.3%')).toBeInTheDocument();
});

it('saves scoped domain rules from structured inputs',async()=>{
  const save=vi.fn().mockResolvedValue({});
  render(<ClassificationEditor initial={[]} events={[]} save={save}/>);
  fireEvent.click(screen.getByText('Add rule'));
  fireEvent.change(screen.getByLabelText('Application or website'),{target:{value:'example.com'}});
  fireEvent.change(screen.getByLabelText('Employee ID (blank = whole company)'),{target:{value:'E1'}});
  fireEvent.change(screen.getByLabelText('Match'),{target:{value:'domain'}});
  fireEvent.change(screen.getByLabelText('Target'),{target:{value:'domain'}});
  fireEvent.click(screen.getByText('Save categories'));
  await waitFor(()=>expect(save).toHaveBeenCalledWith([{match:'example.com',category:'productive',match_kind:'domain',employee_id:'E1',target:'domain'}]));
});
