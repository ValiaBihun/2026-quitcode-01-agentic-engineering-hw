"use client";

import { PButton, PHeading, PModal, PText } from "@porsche-design-system/components-react/ssr";
import styles from "./ConfirmNewGameModal.module.css";

type ConfirmNewGameModalProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmNewGameModal({ open, onConfirm, onCancel }: ConfirmNewGameModalProps) {
  return (
    <PModal open={open} aria={{ role: "alertdialog" }} disableBackdropClick onDismiss={onCancel}>
      <PHeading slot="header" size="large" tag="h2">
        Start a new game?
      </PHeading>
      <PText>
        Your progress on this puzzle will be lost — this can&apos;t be undone.
      </PText>
      <div slot="footer" role="group" className={styles.footer}>
        <PButton type="button" onClick={onConfirm}>
          Start new game
        </PButton>
        <PButton type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </PButton>
      </div>
    </PModal>
  );
}
