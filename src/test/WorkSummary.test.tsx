import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import WorkSummary from '../WorkSummary';
import ClassificationEditor from '../ClassificationEditor';
import type {Attendance, Activity} from '../types';

it('uses summed denominators for team productivity and handles no data',()=>{
  const rows=[{active:3600,productive:1800,required:7200},{active:10800,productive:10800,required:14400}] as Attendance[];
  render(<WorkSummary rows={rows}/>);
  expect(screen.queryByText('87.5%')).not.toBeInTheDocument();
  expect(screen.getAllByText('58.3%')).toHaveLength(2);
});

it('discovers both browser apps and sites and saves explicit productive targets',async()=>{
  const save=vi.fn().mockResolvedValue({});
  const events=[{state:'active',app:'chrome.exe',domain:'github.com'}] as Activity[];
  render(<ClassificationEditor initial={[]} events={events} save={save}/>);
  expect(screen.queryByLabelText('Category for chrome.exe')).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByLabelText('Move github.com'),{key:'1'});
  fireEvent.click(screen.getByRole('button',{name:'Save productivity rules'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith([
    {match:'github.com',target:'domain',category:'productive',match_kind:'domain'},
  ]));
});

it('keeps classification edits when the server rejects a save',async()=>{
  const save=vi.fn().mockRejectedValue(Error('Connection interrupted'));
  render(<ClassificationEditor initial={[]} events={[{state:'active',app:'Code.exe',domain:''}] as Activity[]} save={save}/>);
  fireEvent.keyDown(screen.getByLabelText('Move Code.exe'),{key:'1'});
  fireEvent.click(screen.getByRole('button',{name:'Save productivity rules'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted');
  expect(screen.getByLabelText('Application or website')).toHaveValue('Code.exe');
  expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();
});

it('saves scoped domain rules from structured inputs',async()=>{
  const save=vi.fn().mockResolvedValue({});
  render(<ClassificationEditor initial={[]} events={[]} save={save}/>);
  fireEvent.click(screen.getByText('Add or edit advanced rules'));
  fireEvent.click(screen.getByRole('button',{name:/Add rule/}));
  fireEvent.change(screen.getByLabelText('Application or website'),{target:{value:'example.com'}});
  fireEvent.change(screen.getByLabelText('Employee ID (blank = whole company)'),{target:{value:'E1'}});
  fireEvent.change(screen.getByLabelText('Match'),{target:{value:'domain'}});
  fireEvent.change(screen.getByLabelText('Target'),{target:{value:'domain'}});
  fireEvent.click(screen.getByText('Save productivity rules'));
  await waitFor(()=>expect(save).toHaveBeenCalledWith([{match:'example.com',category:'productive',match_kind:'domain',employee_id:'E1',target:'domain'}]));
});

it('caps each day independently with no offset from extra time',()=>{
 render(<WorkSummary rows={[{productive:36000,required:28800},{productive:21600,required:28800}] as Attendance[]}/>);
 expect(screen.getAllByText('87.5%')).toHaveLength(2);
 expect(screen.getByText('2h 0m remaining of 16h 0m')).toBeInTheDocument();
});
it('drags a rated card back to Unrated and preserves its rule',async()=>{
 const save=vi.fn().mockResolvedValue({});
 render(<ClassificationEditor initial={[{match:'Code.exe',target:'app',category:'productive',match_kind:'exact'}]} events={[]} save={save}/>);
 const transfer={setData:vi.fn(),effectAllowed:'',dropEffect:''};
 fireEvent.dragStart(screen.getByLabelText('Move Code.exe'),{dataTransfer:transfer});
 fireEvent.drop(screen.getByLabelText('unrated drop zone'),{dataTransfer:transfer});
 expect(screen.getByLabelText('unrated drop zone')).toContainElement(screen.getByLabelText('Move Code.exe'));
 fireEvent.click(screen.getByRole('button',{name:'Save productivity rules'}));
 await waitFor(()=>expect(save).toHaveBeenCalledWith([{match:'Code.exe',target:'app',category:'unrated',match_kind:'exact'}]));
});

it('disables unchanged rules and disables again after saving',async()=>{
 const save=vi.fn().mockResolvedValue({});
 render(<ClassificationEditor initial={[]} events={[{state:'active',app:'Code.exe'}] as Activity[]} save={save}/>);
 const button=screen.getByRole('button',{name:'Save productivity rules'});
 expect(button).toBeDisabled();
 fireEvent.keyDown(screen.getByLabelText('Move Code.exe'),{key:'1'});
 expect(button).toBeEnabled();fireEvent.click(button);
 await waitFor(()=>expect(button).toBeDisabled());
});
