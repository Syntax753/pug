import { useState, useEffect } from "react";
import { ModelDeviceProblemsDialog, ModelDeviceProblem } from "decent-portal";

import styles from './LoadScreen.module.css';
import { init, startLoadingModel } from "./interactions/initialization";
import ProgressBar from '@/components/progressBar/ProgressBar';
import TopBar from '@/components/topBar/TopBar';
import ContentButton from "@/components/contentButton/ContentButton";
import pugImage from "@/assets/persona/pug.png";

type Props = {
  onComplete: () => void;
}

function LoadScreen(props: Props) {
  const [percentComplete, setPercentComplete] = useState(0);
  const [isReadyToLoad, setIsReadyToLoad] = useState<boolean>(false);
  const [wasLoadCancelled, setWasLoadCancelled] = useState<boolean>(false);
  const [modalDialogName, setModalDialogName] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>('');
  const [currentTask, setCurrentTask] = useState('Loading');
  const [problems, setProblems] = useState<ModelDeviceProblem[] | null>(null);
  const { onComplete } = props;

  useEffect(() => {
    if (!isReadyToLoad) {
      init(setModelId, setProblems, setModalDialogName).then(setIsReadyToLoad);
      return;
    }
    startLoadingModel(modelId, setPercentComplete, setCurrentTask)
      .then((isInitialized) => { if (isInitialized) onComplete(); });
  }, [isReadyToLoad, modelId]);

  const loadingMessages = [
    "Pixelating sprites...",
    "Generating levels...",
    "Spawning monsters...",
    "Calibrating Pug cuteness...",
    "Sharpening walls...",
    "Hiding snacks...",
    "Calculating escape routes...",
    "Waking up the Roach Mother...",
    "Polishing pixels...",
    "Preparing for adventure..."
  ];

  const messageIndex = Math.min(Math.floor(percentComplete * 10), 9);
  const customMessage = loadingMessages[messageIndex];

  const statusContent = wasLoadCancelled ? (
    <div className={styles.cancelledMessage}>
      <p>Model loading was cancelled.</p>
      <p><ContentButton text='Try Again' onClick={() => window.location.reload()} /></p>
    </div>
  ) : (
    <div className={styles.loadContentWrapper}>
      <div className={styles.introContainer}>
        <h1>Welcome to PuG - Puzzles on a Grid</h1>
        <div className={styles.introBody}>
          <p>You are Pug</p>
          <img src={pugImage} alt="Pug" className={styles.introImage} />
          <p>and you must escape each room.</p>
        </div>
        <h2>Good Luck!</h2>

        <div className={styles.controlsLayout}>
          <div className={styles.movementGrid}>
            <div className={styles.key}>7</div>
            <div className={styles.key}>8</div>
            <div className={styles.key}>9</div>
            <div className={styles.key}>4</div>
            <div className={styles.centerKey}>
              <img src={pugImage} alt="Pug" className={styles.controlPug} />
            </div>
            <div className={styles.key}>6</div>
            <div className={styles.key}>1</div>
            <div className={styles.key}>2</div>
            <div className={styles.key}>3</div>
          </div>

          <div className={styles.actionKeys}>
            <div className={styles.actionRow}>
              <div className={styles.key}>R</div>
              <span>Reset Level</span>
            </div>
            <div className={styles.actionRow}>
              <div className={styles.key}>Z</div>
              <span>Undo Move</span>
            </div>
          </div>
        </div>

      </div>
      <div className={styles.progressBarContainer}>
        <ProgressBar percentComplete={percentComplete} />
        <p className={styles.loadingText}>{customMessage}</p>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        {statusContent}
      </div>

      <ModelDeviceProblemsDialog
        isOpen={modalDialogName === ModelDeviceProblemsDialog.name}
        modelId={modelId}
        problems={problems}
        onConfirm={() => { setModalDialogName(null); setIsReadyToLoad(true); }}
        onCancel={() => { setModalDialogName(null); setWasLoadCancelled(true); }}
      />
    </div>
  );
}

export default LoadScreen;