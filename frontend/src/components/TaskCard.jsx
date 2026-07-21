import { useState } from 'react';
import api from '../api/axios';

export default function TaskCard({ task: initialTask }) {
  const [task, setTask] = useState(initialTask);
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = (status) => {
    const colors = {
      pending: '#f59e0b',
      running: '#3b82f6',
      completed: '#10b981',
      failed: '#ef4444',
    };
    return { backgroundColor: colors[status] || '#6b7280' };
  };

  const getOperationLabel = (op) => {
    const labels = {
      uppercase: 'Uppercase',
      lowercase: 'Lowercase',
      reverse: 'Reverse String',
      wordcount: 'Word Count',
    };
    return labels[op] || op;
  };

  const formatResult = (result, operationType) => {
    if (operationType === 'wordcount') {
      return `Total words: ${result}`;
    }
    return result;
  };

  const refreshTask = async () => {
    try {
      const { data } = await api.get(`/tasks/${task._id}`);
      setTask(data.task);
    } catch (err) {
      console.error('Failed to refresh task:', err);
    }
  };

  return (
    <div className={`task-card ${task.status}`}>
      <div className="task-card-header">
        <h3 className="task-title">{task.title}</h3>
        <span className="status-badge" style={getStatusBadge(task.status)}>
          {task.status}
        </span>
      </div>

      <div className="task-card-body">
        <div className="task-meta">
          <span className="operation-badge">{getOperationLabel(task.operationType)}</span>
          <span className="task-date">
            {new Date(task.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className="task-input-preview">
          <strong>Input:</strong>
          <p className="input-text">{task.inputText.substring(0, 100)}{task.inputText.length > 100 ? '...' : ''}</p>
        </div>

        {task.status === 'running' && (
          <div className="task-running">
            <div className="spinner"></div>
            <span>Processing...</span>
            <button className="btn btn-sm btn-outline" onClick={refreshTask}>
              Refresh
            </button>
          </div>
        )}

        {task.status === 'completed' && task.result !== null && (
          <div className="task-result">
            <strong>Result:</strong>
            <p className="result-text">{formatResult(task.result, task.operationType)}</p>
          </div>
        )}

        {task.status === 'failed' && (
          <div className="task-error">
            <strong>Error:</strong>
            <p>{task.errorMessage}</p>
          </div>
        )}

        <button
          className="btn btn-sm btn-text"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide Logs' : 'View Logs'}
        </button>

        {expanded && (
          <div className="task-logs">
            <h4>Execution Logs</h4>
            <div className="logs-container">
              {task.logs.map((log, index) => (
                <div key={index} className="log-entry">
                  <span className="log-time">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}