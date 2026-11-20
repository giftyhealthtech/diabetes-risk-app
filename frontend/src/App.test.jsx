import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

const commonValues = [
  ['Age group', '2'],
  ['Sex', '1'],
  ['General health', '3'],
  ['Exercise in the past 30 days', '2'],
  ['Smoking status', '1'],
  ['Heavy drinking', '2'],
  ['Heart disease', '2'],
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

    await user.click(screen.getByRole('button', { name: /calculate my estimate/i }))
    expect(screen.getByLabelText('Age group')).toBeInvalid()
    expect(fetch).toHaveBeenCalledWith('/api/health')
    expect(fetch.mock.calls.some(([url]) => url === '/api/predict')).toBe(false)

    await fillCommonFields(user)
    expect(screen.queryByLabelText('Height (m)')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Calculate BMI' }))
    await user.type(screen.getByLabelText('Height (m)'), '1.8')
    await user.type(screen.getByLabelText('Weight (kg)'), '72')
    expect(screen.getByText('22.2')).toBeInTheDocument()

    fetch.mockResolvedValue(
      responseWith({
        Diabetes: 0,
        probability: 0.0183,
        probability_percentage: '1.83%',
        message: 'A sample model explanation.',
      }),
    )
    await user.click(screen.getByRole('button', { name: /calculate my estimate/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/predict',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            age_group: 2,
            sex: 0,
            general_health: 3,
            exercise_30d: 0,
            smoking_status: 1,
            heavy_drinker: 1,
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
      screen.getByText(/does not diagnose diabetes or predict future disease/i),
    ).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: /calculate my estimate/i }))

    expect(screen.getByRole('button', { name: /requesting result/i })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Contacting the prediction service')
    expect(fetch).toHaveBeenCalledWith(
      '/api/predict',
      expect.objectContaining({
        body: JSON.stringify({
          age_group: 2,
          sex: 0,
          general_health: 3,
          exercise_30d: 0,
          smoking_status: 1,
          heavy_drinker: 1,
          heart_disease: 0,
          bmi: 24.5,
        }),
      }),
    )

    resolveResponse(responseWith({ prediction: 1, probability: 0.8 }))
    expect(await screen.findByText('80.0%')).toBeInTheDocument()
  })

  it('submits without BMI and renders the current model API response', async () => {
    const user = userEvent.setup()
    fetch.mockResolvedValue(
      responseWith({
        diabetes_status:
          'You may not be at high risk of diabetes, as your answers are not very similar to people who reported diabetes.',
        chance_of_diabetes: '1.55%',
        explanation:
          'Only about 1.55% of people with answers like yours reported having diabetes, which is low.',
        message:
          'This does not rule out diabetes. Consider routine blood glucose testing and consult a healthcare professional if you have concerns.',
        disclaimer: 'This tool is for educational purposes only and is not a medical diagnostic tool.',
      }),
    )
    render(<App />)

    await fillCommonFields(user)
    await user.click(screen.getByRole('radio', { name: 'Skip BMI' }))
    await user.click(screen.getByRole('button', { name: /calculate my estimate/i }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/predict',
      expect.objectContaining({
        body: JSON.stringify({
          age_group: 2,
          sex: 0,
          general_health: 3,
          exercise_30d: 0,
          smoking_status: 1,
          heavy_drinker: 1,
          heart_disease: 0,
        }),
      }),
    )
    expect(
      await screen.findByText(
        'You may not be at high risk of diabetes, as your answers are not very similar to people who reported diabetes.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('1.55%')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Only about 1.55% of people with answers like yours reported having diabetes, which is low.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Explanation:')).toBeInTheDocument()
    expect(screen.getByText('Advice:')).toBeInTheDocument()
    expect(screen.getByText('Disclaimer:')).toBeInTheDocument()
    expect(
      screen.getByText(/This does not rule out diabetes/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'This tool is for educational purposes only and is not a medical diagnostic tool.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/This percentage is the model’s estimate/)).not.toBeInTheDocument()
  })

  it('shows human-readable survey categories without codes and leaves diabetes status as model output', () => {
    render(<App />)

    expect(screen.queryByText(/Share a few survey details/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Your information is only used/)).not.toBeInTheDocument()
    expect(screen.queryByText('01')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Understand your health. Explore your risk.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Personal and health information' })).toBeInTheDocument()
    expect(screen.getByText('Tell us about yourself and describe your health.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Personal information' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Health indicators' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Body measurements' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'BMI entry method' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Height (m)')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Weight (kg)')).not.toBeInTheDocument()
    expect(screen.getByText('Calculate BMI, enter it directly, or skip.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /calculate my estimate/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Your result will appear here',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('YOUR ASSESSMENT')).toHaveClass('assessment-eyebrow')
    expect(screen.getByRole('heading', { name: 'About this assessment' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '18–24' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '80+' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Excellent' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Female' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Everyday smoker' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Never smoked' })).toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Exercise in the past 30 days')).getByRole('option', {
        name: 'Yes',
      }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Heavy drinking')).getByRole('option', { name: 'No' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^\d+ —/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Diabetes status')).not.toBeInTheDocument()
  })

  it('silently pings the backend health endpoint when the app opens', async () => {
    fetch.mockRejectedValue(new Error('backend unavailable'))

    render(<App />)

    expect(fetch).toHaveBeenCalledWith('/api/health')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('maps the displayed binary choices to the values expected by the prediction API', async () => {
    const user = userEvent.setup()
    fetch.mockResolvedValue(responseWith({ prediction: 0, probability: 0.1 }))
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Age group'), '2')
    await user.selectOptions(screen.getByLabelText('Sex'), '2')
    await user.selectOptions(screen.getByLabelText('General health'), '3')
    await user.selectOptions(screen.getByLabelText('Exercise in the past 30 days'), '1')
    await user.selectOptions(screen.getByLabelText('Smoking status'), '1')
    await user.selectOptions(screen.getByLabelText('Heavy drinking'), '1')
    await user.selectOptions(screen.getByLabelText('Heart disease'), '1')
    await user.click(screen.getByRole('radio', { name: 'Skip BMI' }))
    await user.click(screen.getByRole('button', { name: /calculate my estimate/i }))

    await waitFor(() => {
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
            heart_disease: 1,
          }),
        }),
      )
    })
  })

  it('shows a clear error if the prediction service is unavailable', async () => {
    const user = userEvent.setup()
    fetch.mockResolvedValue(responseWith({ detail: 'internal service details' }, 502))
    render(<App />)

    await fillCommonFields(user)
    await user.click(screen.getByRole('radio', { name: 'Calculate BMI' }))
    await user.type(screen.getByLabelText('Height (m)'), '1.7')
    await user.type(screen.getByLabelText('Weight (kg)'), '68')
    await user.click(screen.getByRole('button', { name: /calculate my estimate/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The prediction service is temporarily unavailable.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent('internal service details')
  })
})
