import styles from '../styles/VideoCall.module.css';

export default function NotificationBox({ notification, onAccept, onDismiss }) {
  if (!notification.visible) return null;

  return (
    <div className={styles.notification}>
      <h3>{notification.title}</h3>
      <p>{notification.message}</p>
      {notification.showAccept && (
        <button 
          className={`${styles.button} ${styles.buttonGreen}`}
          onClick={onAccept}
        >
          Accept
        </button>
      )}
      <button 
        className={`${styles.button} ${styles.buttonRed}`}
        onClick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  );
}