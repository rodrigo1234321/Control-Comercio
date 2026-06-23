'use client';

import styles from './Alert.module.css';

interface AlertProps {
  type: 'success' | 'error' | 'warning';
  message: string;
  onClose?: () => void;
}

export default function Alert({ type, message, onClose }: AlertProps) {
  const getStyleClass = () => {
    switch (type) {
      case 'success': return styles.success;
      case 'error': return styles.error;
      case 'warning': return styles.warning;
      default: return styles.success;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
    }
  };

  return (
    <div className={`${styles.alert} ${getStyleClass()}`}>
      {getIcon()}
      <div className={styles.content}>{message}</div>
      {onClose && (
        <button onClick={onClose} className={styles.closeBtn} aria-label="Cerrar alerta">
          <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
