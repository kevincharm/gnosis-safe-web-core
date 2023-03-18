import type { NextPage } from 'next'
import Head from 'next/head'
import { Box, Button, Grid, Paper, Typography } from '@mui/material'
import SettingsHeader from '@/components/settings/SettingsHeader'
import SignOrExecuteForm from '@/components/tx/SignOrExecuteForm'
import useSignlessModule, {
  createEnableSignlessModule,
  createRegisterDelegateSignerTx,
} from '@/hooks/useSignlessModule'
import TxModal from '@/components/tx/TxModal'
import type { TxStepperProps } from '@/components/tx/TxStepper/useTxStepper'
import useAsync from '@/hooks/useAsync'
import type { SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { useEffect, useMemo, useState } from 'react'
import { Errors, logError } from '@/services/exceptions'
import useChainId from '@/hooks/useChainId'
import { addDays } from 'date-fns'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

function useSignlessModals() {
  const [openEnableSignless, setOpenEnableSignless] = useState<boolean>(false)
  const [openRegisterDelegate, setOpenRegisterDelegate] = useState<boolean>(false)
  return {
    openEnableSignless,
    setOpenEnableSignless,
    openRegisterDelegate,
    setOpenRegisterDelegate,
  }
}

const EnableSignlessModal = ({ onSubmit }: { onSubmit: () => void }) => {
  const chainId = useChainId()
  const [safeTx, safeTxError] = useAsync<SafeTransaction | undefined>(() => {
    return createEnableSignlessModule(chainId)
  }, [chainId])

  useEffect(() => {
    if (safeTxError) {
      logError(Errors._69420, safeTxError.message)
    }
  }, [safeTxError])

  const onFormSubmit = () => {
    // trackEvent(SETTINGS_EVENTS.MODULES.REMOVE_MODULE)

    onSubmit()
  }

  return <SignOrExecuteForm safeTx={safeTx} onSubmit={onFormSubmit} error={safeTxError} />
}

const enableSignlessModalSteps: TxStepperProps['steps'] = [
  {
    label: 'Enable Signless',
    render: (data, onSubmit) => <EnableSignlessModal onSubmit={onSubmit} />,
  },
]

const RegisterDelegateModal = ({
  data,
  onSubmit,
}: {
  data: { delegateAddress: string; expiry: number }
  onSubmit: () => void
}) => {
  const chainId = useChainId()
  const [safeTx, safeTxError] = useAsync<SafeTransaction | undefined>(() => {
    return createRegisterDelegateSignerTx(chainId, data.delegateAddress, data.expiry)
  }, [chainId])

  useEffect(() => {
    if (safeTxError) {
      logError(Errors._69420, safeTxError.message)
    }
  }, [safeTxError])

  const onFormSubmit = () => {
    // trackEvent(SETTINGS_EVENTS.MODULES.REMOVE_MODULE)

    onSubmit()
  }

  return <SignOrExecuteForm safeTx={safeTx} onSubmit={onFormSubmit} error={safeTxError} />
}

const registerDelegateModalSteps: TxStepperProps['steps'] = [
  {
    label: 'Register Delegate',
    render: (data, onSubmit) => <RegisterDelegateModal data={data as any} onSubmit={onSubmit} />,
  },
]

const EnableSignless = () => {
  const { isSignlessEnabled } = useSignlessModule()
  const { openEnableSignless, setOpenEnableSignless } = useSignlessModals()

  return (
    <>
      <Paper sx={{ padding: 4 }}>
        <Grid container direction="row" justifyContent="space-between" spacing={3}>
          <Grid item lg={4} xs={12}>
            <Typography variant="h4" fontWeight={700}>
              Signless module
            </Typography>
          </Grid>

          <Grid item xs>
            <Box>
              <Typography>
                Enabling the Signless module on this Safe allows you to create an ephemeral key to which you can
                delegate the signing of transactions, providing a smoother user experience while using Safe Apps.
              </Typography>
            </Box>
            <Box pt={2}>
              {isSignlessEnabled ? (
                <Typography display="flex" alignItems="center">
                  <CheckCircleIcon color="primary" sx={{ mr: 0.5 }} /> Signless module is enabled on this Safe.
                </Typography>
              ) : (
                <Button variant="contained" onClick={() => setOpenEnableSignless(true)}>
                  Enable Signless
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
      {openEnableSignless && <TxModal onClose={() => setOpenEnableSignless(false)} steps={enableSignlessModalSteps} />}
    </>
  )
}

const LocalDelegate = () => {
  const { delegatePrivateKey, delegateAddress, createLocalDelegate } = useSignlessModule()

  return (
    <>
      <Paper sx={{ padding: 4 }}>
        <Grid container direction="row" justifyContent="space-between" spacing={3}>
          <Grid item lg={4} xs={12}>
            <Typography variant="h4" fontWeight={700}>
              Ephemeral key
            </Typography>
          </Grid>

          <Grid item xs>
            <Box>
              <Typography>
                An ephemeral private key is stored locally in your browser that will be used to automatically sign
                transactions on your behalf. This private key is never sent to any third-party.
              </Typography>
            </Box>
            <Box pt={2}>
              {delegatePrivateKey ? (
                <Typography display="flex" alignItems="center">
                  <CheckCircleIcon color="primary" sx={{ mr: 0.5 }} />
                  Ephemeral key for this Safe:{' '}
                  <Box px={1}>
                    <code>{delegateAddress}</code>
                  </Box>
                </Typography>
              ) : (
                <Button variant="contained" onClick={() => createLocalDelegate()}>
                  Create key
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </>
  )
}

const RegisterDelegate = () => {
  const { delegateAddress, isValidDelegate } = useSignlessModule()
  const { openRegisterDelegate, setOpenRegisterDelegate } = useSignlessModals()

  // TODO(kevincharm): take expiry from a textfield
  const expiry = useMemo(() => Math.floor(addDays(new Date(), 7).valueOf() / 1000), [])

  return (
    <>
      <Paper sx={{ padding: 4 }}>
        <Grid container direction="row" justifyContent="space-between" spacing={3}>
          <Grid item lg={4} xs={12}>
            <Typography variant="h4" fontWeight={700}>
              Register key
            </Typography>
          </Grid>

          <Grid item xs>
            <Box>
              <Typography>
                Your local ephemeral key must be registered to this Safe on the Signless module (on-chain). This allows
                your local Safe instance to automatically sign transactions on your behalf and submit them to the Gelato
                Relay network.
              </Typography>
            </Box>
            <Box pt={2}>
              {isValidDelegate ? (
                <Typography display="flex" alignItems="center">
                  <CheckCircleIcon color="primary" sx={{ mr: 0.5 }} />
                  <Box pr={1}>
                    <code>{delegateAddress}</code>
                  </Box>{' '}
                  is registered as an ephemeral key for this Safe.
                </Typography>
              ) : (
                delegateAddress && (
                  <Button variant="contained" onClick={() => setOpenRegisterDelegate(true)}>
                    Register {delegateAddress.slice(0, 6)}..{delegateAddress.slice(-4)} as delegate
                  </Button>
                )
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
      {openRegisterDelegate && (
        <TxModal
          onClose={() => setOpenRegisterDelegate(false)}
          steps={registerDelegateModalSteps}
          initialData={[{ delegateAddress, expiry }]}
        />
      )}
    </>
  )
}

const Signless: NextPage = () => {
  return (
    <>
      <Head>
        <title>Safe – Settings – Signless Module</title>
      </Head>

      <SettingsHeader />

      <main>
        <Grid container direction="column" spacing={2} pt={2}>
          <Grid item>
            <EnableSignless />
          </Grid>
          <Grid item xs={6} pt={2}>
            <LocalDelegate />
          </Grid>
          <Grid item xs={6} pt={2}>
            <RegisterDelegate />
          </Grid>
        </Grid>
      </main>
    </>
  )
}

export default Signless
