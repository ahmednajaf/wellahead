import { render, screen, fireEvent } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import Shell from '../components/Shell';
test('dock provides labelled navigation, profile and clear controls', () => {
  const navigate = vi.fn(), reset = vi.fn();
  render(<Shell page="home" onNavigate={navigate} onReset={reset}>Content</Shell>);
  expect(screen.getByRole('button',{name:'Home'})).toHaveAttribute('aria-current','page');
  fireEvent.click(screen.getByRole('button',{name:'Health Plan'}));
  expect(navigate).toHaveBeenCalledWith('plan');
  fireEvent.click(screen.getByRole('button',{name:'Your profile'}));
  expect(navigate).toHaveBeenCalledWith('profile');
  fireEvent.click(screen.getByRole('button',{name:'Clear & start again'}));
  expect(reset).toHaveBeenCalledOnce();
});
