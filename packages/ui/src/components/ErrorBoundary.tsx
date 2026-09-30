import * as React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "./button"
import { Card, CardContent } from "./card"

export interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Muda a cada navegação/troca de contexto para descartar o erro anterior automaticamente. */
  resetKey?: string | number
  onError?: (error: Error, info: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Rede de segurança de renderização: sem ela, qualquer exceção não tratada em um
 * componente desmonta toda a árvore React e deixa a tela em branco, exigindo reload
 * completo (e perdendo o estado de navegação) para o usuário se recuperar.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info.componentStack)
    this.props.onError?.(error, info)
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  private handleRetry = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Ocorreu um erro ao exibir esta tela</p>
              <p className="text-sm text-muted-foreground">
                Você pode tentar novamente ou recarregar a página. O erro foi registrado no console.
              </p>
            </div>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" onClick={this.handleRetry}>
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
              <Button size="sm" onClick={() => window.location.reload()}>
                Recarregar página
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
