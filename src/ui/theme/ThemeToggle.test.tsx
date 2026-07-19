import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle (SPEC §8, §10)', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
  })
  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('adds and removes the `dark` class on the document root', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')

    // Initial: light (no matchMedia in jsdom → defaults to light).
    expect(document.documentElement).not.toHaveClass('dark')
    expect(button).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(button)
    expect(document.documentElement).toHaveClass('dark')
    expect(button).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(button)
    expect(document.documentElement).not.toHaveClass('dark')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })
})
