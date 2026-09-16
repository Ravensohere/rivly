import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddTaskDialog } from '../AddTaskDialog';

// Mock matchMedia to prevent dialog animations from crashing.
// jsdom does not implement it, so we supply the subset the dialog touches.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

describe('AddTaskDialog', () => {
  const mockOnAdd = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<AddTaskDialog open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);
    expect(screen.getByPlaceholderText('e.g., Review project proposal')).toBeInTheDocument();
  });

  it('shows parsing preview chips when typing a natural language query', async () => {
    render(<AddTaskDialog open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);
    const input = screen.getByPlaceholderText('e.g., Review project proposal');
    
    await userEvent.type(input, 'Task #work p1');

    await waitFor(() => {
        // Tag chip and priority chip should be visible in the live preview area
        expect(screen.getByText(/Priority 1/i)).toBeInTheDocument();
        // Since 'Work' is also a categorization button, we check for a specific styling or container if needed,
        // but checking visibility of the priority chip is usually enough to prove NLP fired.
    });
  });

  it('shows multi-line detection message', async () => {
    render(<AddTaskDialog open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);
    const input = screen.getByPlaceholderText('e.g., Review project proposal');
    
    await userEvent.type(input, 'Task 1\nTask 2\nTask 3');
    
    await waitFor(() => {
      expect(screen.getByText(/📋 Detected 3 tasks — will add all/i)).toBeInTheDocument();
    });
  });

  it('submits the parsed data directly to onAdd', async () => {
    render(<AddTaskDialog open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);
    const input = screen.getByPlaceholderText('e.g., Review project proposal');
    
    await userEvent.type(input, 'Fix critical bug urgent #work at 5pm');
    
    // Click submit button
    const btn = screen.getByRole('button', { name: /Add Task/i });
    await userEvent.click(btn);
    
    expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Fix critical bug',
      tag: 'work',
      priority: 1,
      time: '17:00'
    }));
  });

  it('submits multi-line tasks to onAdd appropriately', async () => {
    render(<AddTaskDialog open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);
    const input = screen.getByPlaceholderText('e.g., Review project proposal');
    
    await userEvent.type(input, 'First\nSecond');
    
    const btn = screen.getByRole('button', { name: /Add 2 Tasks/i });
    expect(btn).toBeInTheDocument();
    
    await userEvent.click(btn);
    
    expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
      isMultiLine: true,
      tasks: expect.arrayContaining([
        expect.objectContaining({ title: 'First' }),
        expect.objectContaining({ title: 'Second' })
      ])
    }));
  });
});
