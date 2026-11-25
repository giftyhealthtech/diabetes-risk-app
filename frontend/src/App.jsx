import React, { useEffect, useState } from 'react'
import { submitPrediction, warmPredictionService, waitUntilModelReady } from './api.js'
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
    label: 'Age group',
    options: [
      { value: '1', label: '18–24' },
      { value: '2', label: '25–29' },
      { value: '3', label: '30–34' },
      { value: '4', label: '35–39' },
      { value: '5', label: '40–44' },
      { value: '6', label: '45–49' },
      { value: '7', label: '50–54' },
      { value: '8', label: '55–59' },
      { value: '9', label: '60–64' },
      { value: '10', label: '65–69' },
      { value: '11', label: '70–74' },
      { value: '12', label: '75–79' },
      { value: '13', label: '80+' },
    ],
  },
  {
    name: 'sex',
    label: 'Sex',
    options: [
      { value: '1', label: 'Male' },
      { value: '2', label: 'Female' },
    ],
    toApiValue: (value) => (value === 2 ? 1 : 0),
  },
  {
    name: 'general_health',
    label: 'General health',
    options: [
      { value: '1', label: 'Excellent' },
      { value: '2', label: 'Very good' },
      { value: '3', label: 'Good' },
      { value: '4', label: 'Fair' },
      { value: '5', label: 'Poor' },
    ],
  },
  {
    name: 'exercise_30d',
    label: 'Exercise in the past 30 days',
    options: [
      { value: '1', label: 'Yes' },
      { value: '2', label: 'No' },
    ],
    toApiValue: (value) => (value === 1 ? 1 : 0),
  },
  {
    name: 'smoking_status',
    label: 'Smoking status',
    options: [
      { value: '1', label: 'Everyday smoker' },
      { value: '2', label: 'Some-days smoker' },
      { value: '3', label: 'Former smoker' },
      { value: '4', label: 'Never smoked' },
    ],
  },
  {
    name: 'heavy_drinker',
    label: 'Heavy drinking',
    options: [
      { value: '1', label: 'No' },
      { value: '2', label: 'Yes' },
    ],
    toApiValue: (value) => (value === 2 ? 1 : 0),
  },
  {
    name: 'heart_disease',
    label: 'Heart disease',
    options: [
      { value: '1', label: 'Yes' },
      { value: '2', label: 'No' },
    ],
    toApiValue: (value) => (value === 1 ? 1 : 0),
  },
]

const personalFields = numericFields.filter(({ name }) => ['age_group', 'sex'].includes(name))
const healthFields = numericFields.filter(({ name }) => !['age_group', 'sex'].includes(name))

function Field({ id, label, description, options, ...inputProps }) {
  const descriptionId = description ? `${id}-description` : undefined

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {options ? (
        <select id={id} aria-describedby={descriptionId} {...inputProps}>
          <option value="">Choose an option</option>
          {options.map(({ value, label: optionLabel }) => (
            <option key={value} value={value}>{optionLabel}</option>
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
    numericFields.map(({ name, toApiValue }) => {
      const value = getNumericValue(values, name)
      return [name, toApiValue ? toApiValue(value) : value]
    }),
  )

  if (bmiMode === 'direct') {
    payload.bmi = getNumericValue(values, 'bmi')
  } else if (bmiMode === 'calculate') {
    payload.height_m = getNumericValue(values, 'height_m')
    payload.weight_kg = getNumericValue(values, 'weight_kg')
  }

  return payload
}

function legacyProbability(prediction) {
  if (typeof prediction.probability_percentage === 'string') {
    return prediction.probability_percentage
  }
  return `${(prediction.probability * 100).toFixed(1)}%`
}

function App() {
  const [values, setValues] = useState(initialValues)
  const [bmiMode, setBmiMode] = useState('unavailable')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    void warmPredictionService()
  }, [])

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
      const ready = await waitUntilModelReady()
      if (!ready) {
        setError('The prediction service is taking too long. Please try again.')
        return
      }
      const prediction = await submitPrediction(buildPredictionPayload(values, bmiMode))
      setResult(prediction)
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
          <h1 id="page-title">Understand your health. Explore your risk.</h1>
          <p className="intro-copy">
            Complete a short health assessment to explore a survey-based diabetes classification
          </p>
        </section>

        <div className="content-grid">
          <section className="form-card" id="assessment" aria-labelledby="form-title">
            <div className="section-heading">
              <div>
                <h2 id="form-title">Personal and health information</h2>
                <p>Tell us about yourself and describe your health.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <section className="form-subsection" aria-labelledby="personal-title">
                <h3 id="personal-title">Personal information</h3>
                <div className="form-grid">
                  {personalFields.map(({ name, label, description, options }) => (
                    <Field
                      key={name}
                      id={name}
                      name={name}
                      label={label}
                      description={description}
                      options={options}
                      required
                      value={values[name]}
                      onChange={updateValue}
                    />
                  ))}
                </div>
              </section>

              <section className="form-subsection" aria-labelledby="health-title">
                <h3 id="health-title">Health indicators</h3>
                <div className="form-grid">
                  {healthFields.map(({ name, label, description, options }) => (
                    <Field
                      key={name}
                      id={name}
                      name={name}
                      label={label}
                      description={description}
                      options={options}
                      required
                      value={values[name]}
                      onChange={updateValue}
                    />
                  ))}
                </div>
              </section>

              <fieldset className="bmi-section">
                <legend>Body measurements</legend>
                <p className="section-hint">
                  Calculate BMI, enter it directly, or skip.
                </p>
                <div className="choice-row" role="radiogroup" aria-label="BMI entry method">
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
                  <label className={`choice-card ${bmiMode === 'unavailable' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="bmi-mode"
                      value="unavailable"
                      checked={bmiMode === 'unavailable'}
                      onChange={() => setBmiMode('unavailable')}
                    />
                    <span>Skip BMI</span>
                  </label>
                </div>

                {bmiMode === 'calculate' ? (
                  <div className="bmi-fields">
                    <Field
                      id="height_m"
                      name="height_m"
                      label="Height (m)"
                      description="For example, 1.70."
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
                      label="Weight (kg)"
                      description="For example, 68."
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
                ) : bmiMode === 'direct' ? (
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
                ) : null}
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
                    Preparing the model, this can take a minute…
                  </>
                ) : (
                  <>Calculate my estimate <span aria-hidden="true">→</span></>
                )}
              </button>
            </form>
          </section>

          <aside className="side-column" id="about">
            <section className="result-card" aria-labelledby="result-title">
              <p className="eyebrow assessment-eyebrow">YOUR ASSESSMENT</p>
              <h2 id="result-title">
                Your result will appear here
              </h2>
              {result ? (
                <div className="result-content" aria-live="polite">
                  <div className="result-value">
                    <span>{result.diabetes_status ? 'Diabetes status' : 'Diabetes'}</span>
                    <strong>{result.diabetes_status ?? result.Diabetes ?? result.prediction}</strong>
                  </div>
                  <div className="result-value">
                    <span>{result.chance_of_diabetes ? 'Chance of diabetes' : 'Probability'}</span>
                    <strong>
                      {result.chance_of_diabetes ?? legacyProbability(result)}
                    </strong>
                  </div>
                  {result.explanation && (
                    <p><strong>Explanation:</strong> {result.explanation}</p>
                  )}
                  {result.message && (
                    <p><strong>Advice:</strong> {result.message}</p>
                  )}
                  {result.disclaimer && (
                    <p><strong>Disclaimer:</strong> {result.disclaimer}</p>
                  )}
                  {!result.disclaimer && (
                    <p><strong>Disclaimer:</strong>{' '}
                      This application is educational and does not diagnose diabetes
                      or predict future disease.
                    </p>
                  )}
                </div>
              ) : (
                <p className="empty-result">
                  Your result will appear here after you complete the form.
                </p>
              )}
              {isLoading && <p className="loading-note" role="status">Contacting the prediction service…</p>}
            </section>

            <section className="disclaimer-card" aria-labelledby="disclaimer-title">
              <div className="disclaimer-icon" aria-hidden="true">i</div>
              <div>
                <h2 id="disclaimer-title">About this assessment</h2>
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
