import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

const commonValues = [
  ['Age group code', '2'],
  ['Sex code', '1'],
  ['General health code', '3'],
  ['Exercise in the past 30 days (code)', '1'],
  ['Smoking status code', '1'],
  ['Heavy drinking classification code', '0'],
  ['Heart disease history code', '0'],
]

async function fillCommonFields(user) {
  for (const [label, value] of commonValues) {
    const field = screen.getByLabelText(label)
    if (field.tagName === 'SELECT') {
      await user.selectOptions(field, value)
    } else {
      await user.type(field, value)
    }
  }
}

function responseWith(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe('prediction workflow', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('requires valid health information and sends calculated BMI inputs to the backend', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /view my result/i }))
    expect(screen.getByLabelText('Age group code')).toBeInvalid()
    expect(fetch).not.toHaveBeenCalled()

    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Height'), '1.8')
    await user.type(screen.getByLabelText('Weight'), '72')
    expect(screen.getByText('22.2')).toBeInTheDocument()

    fetch.mockResolvedValue(
      responseWith({
        Diabetes: 0,
        probability: 0.0183,
        probability_percentage: '1.83%',
        message: 'A sample model explanation.',
      }),
    )
    await user.click(screen.getByRole('button', { name: /view my result/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/predict',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            age_group: 2,
            sex: 1,
            general_health: 3,
            exercise_30d: 1,
            smoking_status: 1,
            heavy_drinker: 0,
            heart_disease: 0,
            height_m: 1.8,
            weight_kg: 72,
          }),
        }),
      )
    })
    expect(await screen.findByText('1.83%')).toBeInTheDocument()
    expect(screen.getByText('Diabetes', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('0', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('A sample model explanation.')).toBeInTheDocument()
    expect(
      screen.getByText(/self-reported diabetes status; it is not your chance/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/not a medical diagnostic tool/i)).toBeInTheDocument()
  })

  it('accepts direct BMI and shows the loading state while the backend responds', async () => {
    const user = userEvent.setup()
    let resolveResponse
    fetch.mockReturnValue(
      new Promise((resolve) => {
        resolveResponse = resolve
      }),
    )
    render(<App />)

    await fillCommonFields(user)
    await user.click(screen.getByRole('radio', { name: 'Enter BMI' }))
    await user.type(screen.getByLabelText('BMI'), '24.5')
    await user.click(screen.getByRole('button', { name: /view my result/i }))

    expect(screen.getByRole('button', { name: /requesting result/i })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Contacting the prediction service')
    expect(fetch).toHaveBeenCalledWith(
      '/api/predict',
      expect.objectContaining({
        body: JSON.stringify({
          age_group: 2,
          sex: 1,
          general_health: 3,
          exercise_30d: 1,
          smoking_status: 1,
          heavy_drinker: 0,
          heart_disease: 0,
          bmi: 24.5,
        }),
      }),
    )

    resolveResponse(responseWith({ prediction: 1, probability: 0.8 }))
    expect(await screen.findByText('80.0%')).toBeInTheDocument()
  })

  it('shows a clear error if the prediction service is unavailable', async () => {
    const user = userEvent.setup()
    fetch.mockResolvedValue(responseWith({ detail: 'internal service details' }, 502))
    render(<App />)

    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Height'), '1.7')
    await user.type(screen.getByLabelText('Weight'), '68')
    await user.click(screen.getByRole('button', { name: /view my result/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The prediction service is temporarily unavailable.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent('internal service details')
  })
})
