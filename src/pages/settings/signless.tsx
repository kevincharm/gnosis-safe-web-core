import type { NextPage } from 'next'
import Head from 'next/head'
import { Alert, Box, Button, Grid, Paper, TextField, Typography } from '@mui/material'
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
import { useEffect, useState } from 'react'
import { Errors, logError } from '@/services/exceptions'
import useChainId from '@/hooks/useChainId'
import { addDays } from 'date-fns'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SentimentVeryDissatisfied from '@mui/icons-material/SentimentVeryDissatisfied'
import css from '@/components/settings/SafeModules/styles.module.css'
import { createMultiSendCallOnlyTx } from '@/services/tx/tx-sender/create'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

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
  const { isSignlessEnabled, signlessModuleAddress } = useSignlessModule()
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
              <Box pt={2}>
                <Alert variant="filled" severity="warning">
                  Please note: Signless has not been audited. Please use with caution.
                </Alert>
              </Box>
            </Box>
            {signlessModuleAddress ? (
              <Box pt={4}>
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
            ) : (
              <Box pt={4}>
                <Typography display="flex" alignItems="center">
                  <SentimentVeryDissatisfied color="warning" sx={{ mr: 0.5 }} /> Signless module is not yet deployed to
                  this network.
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
      {openEnableSignless && <TxModal onClose={() => setOpenEnableSignless(false)} steps={enableSignlessModalSteps} />}
    </>
  )
}

const LocalDelegate = () => {
  const { delegatePrivateKey, delegateAddress, createLocalDelegate, deleteLocalDelegate } = useSignlessModule()

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
            <Box pt={4}>
              {delegatePrivateKey ? (
                <Grid container direction="column" spacing={2}>
                  <Grid item>
                    <Typography display="flex" alignItems="center">
                      <CheckCircleIcon color="primary" sx={{ mr: 0.5 }} />
                      Ephemeral key for this Safe:{' '}
                      <Box px={1}>
                        <code>{delegateAddress}</code>
                      </Box>
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Button color="error" onClick={deleteLocalDelegate}>
                      Delete
                    </Button>
                  </Grid>
                </Grid>
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

const RevokeKeyModal = ({ data, onSubmit }: { data: { index: number }; onSubmit: () => void }) => {
  const chainId = useChainId()
  const { signlessContract } = useSignlessModule()
  const [safeTx, safeTxError] = useAsync<SafeTransaction | undefined>(async () => {
    if (!signlessContract || !data || typeof data.index === 'undefined') return

    const tx = await signlessContract.populateTransaction.revokeDelegateSigner(data.index)
    return createMultiSendCallOnlyTx([
      {
        to: tx.to!,
        value: tx.value?.toString() || '0',
        data: tx.data!,
      },
    ])
  }, [chainId, signlessContract, data])

  useEffect(() => {
    // if (safeTxError) {
    // logError(Errors._69420, safeTxError.message)
    // }
  }, [safeTxError])

  const onFormSubmit = () => {
    // trackEvent(SETTINGS_EVENTS.MODULES.REMOVE_MODULE)

    onSubmit()
  }

  return <SignOrExecuteForm safeTx={safeTx} onSubmit={onFormSubmit} error={safeTxError} />
}

const revokeKeyModalSteps: TxStepperProps['steps'] = [
  {
    label: 'Revoke key',
    render: (data, onSubmit) => <RevokeKeyModal data={data as any} onSubmit={onSubmit} />,
  },
]

const RegisteredDelegate = ({ index, delegate }: { index: number; delegate: string }) => {
  const [openRevokeModal, setOpenRevokeModal] = useState<boolean>(false)

  return (
    <>
      <Box className={css.container}>
        {delegate}{' '}
        <Button color="error" onClick={() => setOpenRevokeModal(true)}>
          Revoke
        </Button>
      </Box>
      {openRevokeModal && (
        <TxModal onClose={() => setOpenRevokeModal(false)} steps={revokeKeyModalSteps} initialData={[{ index }]} />
      )}
    </>
  )
}

const RegisterDelegate = () => {
  const { delegateAddress, isValidDelegate, isSignlessEnabled, registeredDelegates } = useSignlessModule()
  const { openRegisterDelegate, setOpenRegisterDelegate } = useSignlessModals()

  const [expirySeconds, setExpirySeconds] = useState<number>(Math.floor(addDays(new Date(), 7).valueOf() / 1000))

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
                Relay network. Your ephemeral key will be usable until the specified expiry, after which you must renew
                the key via another transaction.
              </Typography>
            </Box>
            <Box pt={4}>
              {isValidDelegate ? (
                <Typography display="flex" alignItems="center">
                  <CheckCircleIcon color="primary" sx={{ mr: 0.5 }} />
                  Your ephemeral key is registered for this Safe.
                </Typography>
              ) : (
                delegateAddress && (
                  <Grid container direction="column" spacing={2}>
                    <Grid item>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          label="Expiry"
                          value={expirySeconds * 1000}
                          onChange={(value) => {
                            if (!value) return
                            setExpirySeconds(Math.floor(value / 1000))
                          }}
                          renderInput={(props) => <TextField type="date" {...props} />}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item>
                      <Button
                        variant="contained"
                        onClick={() => setOpenRegisterDelegate(true)}
                        disabled={!isSignlessEnabled}
                      >
                        Register {delegateAddress.slice(0, 6)}..{delegateAddress.slice(-4)} as delegate
                      </Button>
                    </Grid>
                  </Grid>
                )
              )}
              <Grid container direction="column" pt={4}>
                <Grid item>
                  <Typography variant="h5">Registered keys</Typography>
                </Grid>
                <Grid item>
                  {registeredDelegates.map((delegate, i) => (
                    <RegisteredDelegate key={i} index={i} delegate={delegate} />
                  ))}
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      {openRegisterDelegate && (
        <TxModal
          onClose={() => setOpenRegisterDelegate(false)}
          steps={registerDelegateModalSteps}
          initialData={[{ delegateAddress, expiry: expirySeconds }]}
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
