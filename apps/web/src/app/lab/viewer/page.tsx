import ViewerLoader from '@/components/lab/ViewerLoader';
import styles from '../lab.module.css';

export default function ViewerLabPage() {
  return (
    <main className={styles.viewer}>
      <ViewerLoader />
    </main>
  );
}
