import React, { useState } from 'react'
import { submitPrediction } from './api.js'
import './App.css'

const initialValues = {
  age_group: '',
  sex: '',
  general_health: '',
  exercise_30d: '',
  smoking_status: '',
  heavy_drinker: '',
  heart_disease: '',
  bmi: '',
  height_m: '',
  weight_kg: '',
}

const numericFields = [
  {
    name: 'age_group',
    label: 'Age group code',
    min: 1,
    description: 'Use the numeric category code expected by the prediction API.',
  },
  {
    name: 'sex',
    label: 'Sex code',
    min: 0,
    description: 'Use the numeric category code expected by the prediction API.',
  },
  {
    name: 'general_health',
    label: 'General health code',
    min: 0,
    description: 'Use the numeric category code expected by the prediction API.',
  },
  {
    name: 'exercise_30d',
    label: 'Exercise in the past 30 days (code)',
    min: 0,
    description: 'Use the numeric category code expected by the prediction API.',
  },
  {
    name: 'smoking_status',
    label: 'Smoking status code',
    options: [1, 2, 3, 4],
    description: 'The prediction API accepts codes 1, 2, 3 or 4.',
  },
  {
    name: 'heavy_drinker',
    label: 'Heavy drinking classification code',
    min: 0,
    description: 'Use the numeric category code expected by the prediction API.',
  },
  {
    name: 'heart_disease',
    label: 'Heart disease history code',
    min: 0,
    description: 'Use the numeric category code expected by the prediction API.',
  },
]

function Field({ id, label, description, options, ...inputProps }) {
  const descriptionId = `${id}-description`

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {options ? (
        <select id={id} aria-describedby={descriptionId} {...inputProps}>
          <option value="">Choose a code</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input id={id} aria-describedby={descriptionId} {...inputProps} />
      )}
      {description && (
        <p className="field-help" id={descriptionId}>
          {description}
        </p>
      )}
    </div>
  )
}

function getNumericValue(values, name) {
  return Number(values[name])
}

function buildPredictionPayload(values, bmiMode) {
  const payload = Object.fromEntries(
    numericFields.map(({ name }) => [name, getNumericValue(values, name)]),
  )

  if (bmiMode === 'direct') {
    payload.bmi = getNumericValue(values, 'bmi')
  } else {
    payload.height_m = getNumericValue(values, 'height_m')
    payload.weight_kg = getNumericValue(values, 'weight_kg')
  }

  return payload
}

function formatClassification(value) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    throw new Error('Unexpected prediction response')
  }
  return String(value)
}

function formatProbability(prediction) {
  const value = prediction.probability
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error('Unexpected prediction response')
  }
  if (prediction.probability_percentage !== undefined) {
    if (
      typeof prediction.probability_percentage !== 'string' ||
      !/^\d+(?:\.\d+)?%$/.test(prediction.probability_percentage)
    ) {
      throw new Error('Unexpected prediction response')
    }
    return prediction.probability_percentage
  }
  return `${(value * 100).toFixed(1)}%`
}

function App() {
  const [values, setValues] = useState(initialValues)
  const [bmiMode, setBmiMode] = useState('calculate')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const updateValue = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setError('')
  }

  const computedBmi =
    Number(values.height_m) > 0 && Number(values.weight_kg) > 0
      ? Number(values.weight_kg) / Number(values.height_m) ** 2
      : null

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)
    setIsLoading(true)

    try {
      const prediction = await submitPrediction(buildPredictionPayload(values, bmiMode))
      if (prediction.message !== undefined && typeof prediction.message !== 'string') {
        throw new Error('Unexpected prediction response')
      }
      const diabetesClassification = prediction.Diabetes ?? prediction.prediction
      setResult({
        classification: formatClassification(diabetesClassification),
        probability: formatProbability(prediction),
        explanation: prediction.message ?? '',
      })
    } catch (requestError) {
      setError(
        requestError.userMessage ??
          'We could not complete the prediction. Please try again later.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Diabetes Risk App home">
          <span className="brand-mark" aria-hidden="true">+</span>
          <span>Health insight</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#assessment">Assessment</a>
          <a href="#about">About</a>
        </nav>
      </header>

      <main id="home">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">EDUCATIONAL HEALTH TOOL</p>
          <h1 id="page-title">Explore your health profile</h1>
          <p className="intro-copy">
            Share a few survey details to see a machine-learning classification
            based on self-reported diabetes status.
          </p>
          <div className="privacy-note">
            <span aria-hidden="true">●</span>
            Your information is only used to request this result and is not saved by this page.
          </div>
        </section>

        <div className="content-grid">
          <section className="form-card" id="assessment" aria-labelledby="form-title">
            <div className="section-heading">
              <span className="step-number" aria-hidden="true">01</span>
              <div>
                <h2 id="form-title">Health information</h2>
                <p>Enter the numeric category codes used by the prediction API.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                {numericFields.map(({ name, label, min, description, options }) => (
                  <Field
                    key={name}
                    id={name}
                    name={name}
                    label={label}
                    description={description}
                    options={options}
                    {...(options ? {} : { type: 'number', min, step: '1' })}
                    required
                    value={values[name]}
                    onChange={updateValue}
                  />
                ))}
              </div>

              <fieldset className="bmi-section">
                <legend>Body mass index (BMI)</legend>
                <p className="section-hint">
                  BMI is required for a prediction. Enter it directly or calculate it from height and weight.
                </p>
                <div className="choice-row">
                  <label className={`choice-card ${bmiMode === 'calculate' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="bmi-mode"
                      value="calculate"
                      checked={bmiMode === 'calculate'}
                      onChange={() => setBmiMode('calculate')}
                    />
                    <span>Calculate BMI</span>
                  </label>
                  <label className={`choice-card ${bmiMode === 'direct' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="bmi-mode"
                      value="direct"
                      checked={bmiMode === 'direct'}
                      onChange={() => setBmiMode('direct')}
                    />
                    <span>Enter BMI</span>
                  </label>
                </div>

                {bmiMode === 'calculate' ? (
                  <div className="bmi-fields">
                    <Field
                      id="height_m"
                      name="height_m"
                      label="Height"
                      description="Enter height in metres, for example 1.70."
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      value={values.height_m}
                      onChange={updateValue}
                      placeholder="1.70"
                    />
                    <Field
                      id="weight_kg"
                      name="weight_kg"
                      label="Weight"
                      description="Enter weight in kilograms, for example 68."
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      value={values.weight_kg}
                      onChange={updateValue}
                      placeholder="68"
                    />
                    <div className="bmi-preview" aria-live="polite">
                      <span>Calculated BMI</span>
                      <strong>{computedBmi ? computedBmi.toFixed(1) : '—'}</strong>
                    </div>
                  </div>
                ) : (
                  <Field
                    id="bmi"
                    name="bmi"
                    label="BMI"
                    description="Enter a BMI value greater than zero."
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={values.bmi}
                    onChange={updateValue}
                    placeholder="24.5"
                  />
                )}
              </fieldset>

              {error && (
                <div className="alert error-alert" role="alert">
                  <strong>We couldn’t get your result.</strong>
                  <span>{error}</span>
                </div>
              )}

              <button className="submit-button" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Requesting result…
                  </>
                ) : (
                  <>View my result <span aria-hidden="true">→</span></>
                )}
              </button>
            </form>
          </section>

          <aside className="side-column" id="about">
            <section className="result-card" aria-labelledby="result-title">
              <p className="eyebrow">YOUR RESULT</p>
              <h2 id="result-title">Prediction summary</h2>
              {result ? (
                <div className="result-content" aria-live="polite">
                  <div className="result-value">
                    <span>Diabetes</span>
                    <strong>{result.classification}</strong>
                  </div>
                  <div className="result-value">
                    <span>Probability</span>
                    <strong>{result.probability}</strong>
                  </div>
                  <p>
                    This percentage is the model’s estimate from survey responses.
                    It relates to self-reported diabetes status; it is not your
                    chance of developing diabetes in the future.
                  </p>
                  {result.explanation && <p>{result.explanation}</p>}
                </div>
              ) : (
                <p className="empty-result">
                  Complete the form to see the classification and estimated class probability here.
                </p>
              )}
              {isLoading && <p className="loading-note" role="status">Contacting the prediction service…</p>}
            </section>

            <section className="disclaimer-card" aria-labelledby="disclaimer-title">
              <div className="disclaimer-icon" aria-hidden="true">i</div>
              <div>
                <h2 id="disclaimer-title">A note about this tool</h2>
                <p>
                  This educational tool classifies self-reported diabetes status
                  from survey data. It is not a medical diagnostic tool and must
                  not be used to diagnose diabetes or guide treatment decisions.
                  Consult a qualified healthcare professional for medical advice.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <span>Health insight · Educational use only</span>
        <a href="https://diabetes-risk-prediction-tmkn.onrender.com/docs" target="_blank" rel="noreferrer">
          Prediction API documentation <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </div>
  )
}

export default App
