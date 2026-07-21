import { useState } from 'react';
import api from '../api/axios';

const OPERATIONS = [
  { value: 'uppercase', label: 'Uppercase', desc: 'Convert all characters to uppercase' },
  { value: 'lowercase', label: 'Lowercase', desc: 'Convert all characters to lowercase' },
  { value: 'reverse', label: 'Reverse String', desc: 'Reverse the input string' },
  { value: 'wordcount', label: 'Word Count', desc: 'Return the total number of words' },
];

export default function CreateTaskModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [inputText, setInputText] = useState('');
  const [operationType, setOperationType] = useState('uppercase');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post('/tasks', { title, inputText, operationType });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Task</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter task title"
            />
          </div>

          <div className="form-group">
            <label>Input Text</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              required
              rows={4}
              placeholder="Enter the text to process"
            />
          </div>

          <div className="form-group">
            <label>Operation Type</label>
            <div className="operation-options">
              {OPERATIONS.map((op) => (
                <label
                  key={op.value}
                  className={`operation-option ${operationType === op.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="operationType"
                    value={op.value}
                    checked={operationType === op.value}
                    onChange={(e) => setOperationType(e.target.value)}
                  />
                  <div className="operation-info">
                    <span className="operation-name">{op.label}</span>
                    <span className="operation-desc">{op.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Run Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}