import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import WorkSummary from '../WorkSummary';
import ClassificationEditor from '../ClassificationEditor';
import type {Attendance, Activity} from '../types';

it('uses summed denominators for team productivity and handles no data',()=>{
  const rows=[{active:3600,productive:1800,required:7200},{active:10800,productive:10800,required:14400}] as Attendance[];
  render(<WorkSummary rows={rows}/>);
  expect(screen.queryByText('87.5%')).not.toBeInTheDocument();
  expect(screen.getByText('58.3%')).toBeInTheDocument();
});

it('discovers both browser apps and sites and saves explicit productive targets',async()=>{
  const save=vi.fn().mockResolvedValue({});
  const events=[{state:'active',app:'chrome.exe',domain:'github.com'}] as Activity[];
  render(<ClassificationEditor initial={[]} events={events} save={save}/>);
  fireEvent.click(screen.getByRole('button',{name:'Whitelist chrome.exe'}));
  fireEvent.click(screen.getByRole('button',{name:'Whitelist github.com'}));
  fireEvent.click(screen.getByRole('button',{name:'Save productivity rules'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith([
    {match:'chrome.exe',target:'app',category:'productive',match_kind:'exact'},
    {match:'github.com',target:'domain',category:'productive',match_kind:'domain'},
  ]));
});

it('keeps classification edits when the server rejects a save',async()=>{
  const save=vi.fn().mockRejectedValue(Error('Connection interrupted'));
  render(<ClassificationEditor initial={[]} events={[{state:'active',app:'Code.exe',domain:''}] as Activity[]} save={save}/>);
  fireEvent.click(screen.getByRole('button',{name:'Whitelist Code.exe'}));
  fireEvent.click(screen.getByRole('button',{name:'Save productivity rules'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted');
  expect(screen.getByLabelText('Application or website')).toHaveValue('Code.exe');
  expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();
});

it('saves scoped domain rules from structured inputs',async()=>{
  const save=vi.fn().mockResolvedValue({});
  render(<ClassificationEditor initial={[]} events={[]} save={save}/>);
  fireEvent.click(screen.getByRole('button',{name:/Add rule/}));
  fireEvent.change(screen.getByLabelText('Application or website'),{target:{value:'example.com'}});
  fireEvent.change(screen.getByLabelText('Employee ID (blank = whole company)'),{target:{value:'E1'}});
  fireEvent.change(screen.getByLabelText('Match'),{target:{value:'domain'}});
  fireEvent.change(screen.getByLabelText('Target'),{target:{value:'domain'}});
  fireEvent.click(screen.getByText('Save productivity rules'));
  await waitFor(()=>expect(save).toHaveBeenCalledWith([{match:'example.com',category:'productive',match_kind:'domain',employee_id:'E1',target:'domain'}]));
});
