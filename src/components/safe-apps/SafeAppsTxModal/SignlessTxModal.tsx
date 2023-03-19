import { Box, Button, Grid, Paper, Typography } from '@mui/material'
import type { SignlessTxModalState } from './useTxModal'
import LoadingSpinner from '@/components/new-safe/create/steps/StatusStep/LoadingSpinner'
import { SafeCreationStatus } from '@/components/new-safe/create/steps/StatusStep/useSafeCreation'
import { useMemo } from 'react'
import { Close } from '@mui/icons-material'

const SignlessTxModal = ({
  data,
  closeSignlessTxModal,
}: {
  data: SignlessTxModalState
  closeSignlessTxModal: () => void
}) => {
  const statusText = useMemo(() => {
    const relayTxStatus = data.relayTxStatus
    if (!relayTxStatus) {
      return 'Submitting to relay...'
    } else if (relayTxStatus.taskState === 'Cancelled' || relayTxStatus.taskState === 'ExecReverted') {
      return `${relayTxStatus.taskState}: ${relayTxStatus.lastCheckMessage}`
    } else {
      return relayTxStatus.taskState
    }
  }, [data.relayTxStatus])

  return (
    <Paper
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        minWidth: 480,
        maxWidth: '100%',
      }}
    >
      <Box padding={1} style={{ position: 'absolute', right: 0 }}>
        <Button color="secondary" onClick={closeSignlessTxModal}>
          <Close />
        </Button>
      </Box>
      <Grid container direction="column" padding={4}>
        <Grid item>
          <Grid container alignItems="center">
            <Box maxHeight={64} pl={2}>
              <LoadingSpinner status={SafeCreationStatus.AWAITING} />
            </Box>
            <Grid item pl={6}>
              <Typography variant="body1">Signless transaction</Typography>
              <Grid item>
                <Box pt={2}>
                  <Typography color="GrayText">Task state</Typography>
                </Box>
                <Box>
                  <Typography variant="body1">{statusText}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  )
}

export default SignlessTxModal
