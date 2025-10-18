"use client";
import styles from './index.module.css';

// Component cho nền động (Tái sử dụng)
export default function AnimatedBackground() {
    return (
        <div className={styles.backgroundShapes} aria-hidden="true">
            <span className={`${styles.shape} ${styles.shape1}`}></span>
            <span className={`${styles.shape} ${styles.shape2}`}></span>
            <span className={`${styles.shape} ${styles.shape3}`}></span>
            <span className={`${styles.shape} ${styles.shape4}`}></span>
            <span className={`${styles.shape} ${styles.shape5}`}></span>
            <span className={`${styles.shape} ${styles.shape6}`}></span>
            <span className={`${styles.shape} ${styles.shape7}`}></span>
            <span className={`${styles.shape} ${styles.shape8}`}></span>
            <span className={`${styles.shape} ${styles.shape9}`}></span>
            <span className={`${styles.shape} ${styles.shape10}`}></span>
            <span className={`${styles.shape} ${styles.shape11}`}></span>
            <span className={`${styles.shape} ${styles.shape12}`}></span>
        </div>
    );
}