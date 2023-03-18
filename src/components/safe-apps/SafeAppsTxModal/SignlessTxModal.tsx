import { Box, Grid, Paper, Typography } from '@mui/material'
import type { SignlessTxModalState } from './useTxModal'
import LoadingSpinner from '@/components/new-safe/create/steps/StatusStep/LoadingSpinner'
import { SafeCreationStatus } from '@/components/new-safe/create/steps/StatusStep/useSafeCreation'

const SignlessTxModal = ({ data }: { data: SignlessTxModalState }) => {
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
                  <Typography variant="body1">{data.relayTxStatus?.taskState || 'Submitting to relay...'}</Typography>
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
