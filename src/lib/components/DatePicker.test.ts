import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import DatePicker from './DatePicker.svelte';

const baseProps = {
  viewDate: '2026-11-05',
  nowMs: Date.parse('2026-11-05T12:00:00Z'),
  homeZone: 'Europe/Madrid',
  onSelectDate: vi.fn(),
  onToday: vi.fn(),
};

it('opens on the selected month and selects a custom date', async () => {
  const onSelectDate = vi.fn();
  render(DatePicker, { props: { ...baseProps, onSelectDate } });

  await fireEvent.click(screen.getByRole('button', { name: 'Pick a date' }));
  expect(screen.getByRole('dialog', { name: 'Choose a date' })).toBeInTheDocument();
  expect(screen.getByLabelText('Jump to date')).toHaveFocus();
  expect(screen.getByText('November 2026')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Thursday, November 5, 2026' })).toHaveAttribute(
    'aria-current',
    'date',
  );

  await fireEvent.click(screen.getByRole('button', { name: 'Friday, November 20, 2026' }));
  expect(onSelectDate).toHaveBeenCalledWith('2026-11-20');
  expect(screen.queryByRole('dialog', { name: 'Choose a date' })).not.toBeInTheDocument();
});

it('moves between months and closes on Escape', async () => {
  render(DatePicker, { props: baseProps });

  await fireEvent.click(screen.getByRole('button', { name: 'Pick a date' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByText('December 2026')).toBeInTheDocument();
  await fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.getByText('November 2026')).toBeInTheDocument();

  await fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Choose a date' })).not.toBeInTheDocument();
});

it('closes when clicking outside', async () => {
  render(DatePicker, { props: baseProps });

  await fireEvent.click(screen.getByRole('button', { name: 'Pick a date' }));
  expect(screen.getByRole('dialog', { name: 'Choose a date' })).toBeInTheDocument();
  await fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('dialog', { name: 'Choose a date' })).not.toBeInTheDocument();
});

it('runs the shared Today action from the footer', async () => {
  const onToday = vi.fn();
  render(DatePicker, { props: { ...baseProps, onToday } });

  await fireEvent.click(screen.getByRole('button', { name: 'Pick a date' }));
  const dialog = screen.getByRole('dialog', { name: 'Choose a date' });
  await fireEvent.click(within(dialog).getByRole('button', { name: 'Today' }));
  expect(onToday).toHaveBeenCalled();
  expect(screen.queryByRole('dialog', { name: 'Choose a date' })).not.toBeInTheDocument();
});

it('jumps directly to a distant date', async () => {
  const onSelectDate = vi.fn();
  render(DatePicker, { props: { ...baseProps, onSelectDate } });

  await fireEvent.click(screen.getByRole('button', { name: 'Pick a date' }));
  const input = screen.getByLabelText('Jump to date');
  await fireEvent.input(input, { target: { value: '1985-03-14' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Go to date' }));

  expect(onSelectDate).toHaveBeenCalledWith('1985-03-14');
  expect(screen.queryByRole('dialog', { name: 'Choose a date' })).not.toBeInTheDocument();
});

it('jumps the calendar to a distant year or month without selecting', async () => {
  const onSelectDate = vi.fn();
  render(DatePicker, { props: { ...baseProps, onSelectDate } });

  await fireEvent.click(screen.getByRole('button', { name: 'Pick a date' }));
  const input = screen.getByLabelText('Jump to date');
  await fireEvent.input(input, { target: { value: '1985-03' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Go to date' }));

  expect(screen.getByText('March 1985')).toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Choose a date' })).toBeInTheDocument();
  expect(onSelectDate).not.toHaveBeenCalled();
});

it('explains an impossible jumped date', async () => {
  render(DatePicker, { props: baseProps });

  await fireEvent.click(screen.getByRole('button', { name: 'Pick a date' }));
  const input = screen.getByLabelText('Jump to date');
  await fireEvent.input(input, { target: { value: '2026-02-30' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Go to date' }));

  expect(screen.getByRole('alert')).toHaveTextContent('That date does not exist.');
  expect(screen.getByRole('dialog', { name: 'Choose a date' })).toBeInTheDocument();
});
