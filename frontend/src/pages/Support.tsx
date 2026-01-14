import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  CreditCard,
  Settings,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supportTicketApi, SupportTicket as TicketType, TicketReply } from '@/services/supportTicketApi';
import { faqApi, Faq } from '@/services/faqApi';
import { feedbackApi } from '@/services/feedbackApi';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';

const Support = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isTicketDetailOpen, setIsTicketDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [faqLoading, setFaqLoading] = useState(false);

  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [faqs, setFaqs] = useState<Record<string, Faq[]>>({});

  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    category: 'general' as 'technical' | 'billing' | 'account' | 'content' | 'general',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const response = await supportTicketApi.getUserTickets();
        if (response.success) {
          const ticketsData = Array.isArray(response.data) ? response.data : response.data?.data || [];
          setTickets(ticketsData);
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchFaqs = async () => {
      setFaqLoading(true);
      try {
        const response = await faqApi.getFaqs(undefined, locale);
        if (response.success) {
          // Keep the grouped structure for category display (same as home screen)
          setFaqs(response.data || {});
        } else {
          setFaqs({});
        }
      } catch (error) {
        console.error('Error fetching FAQs:', error);
        setFaqs({});
      } finally {
        setFaqLoading(false);
      }
    };

    if (user) {
      fetchTickets();
    }
    fetchFaqs();
  }, [user, locale]);

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    
    if (status === 'resolved' || status === 'closed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-900/20 border border-green-900/30 text-green-400 text-[10px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> {t('supporting.resolved', 'Resuelto')}
        </span>
      );
    }
    if (status === 'in_progress' || status === 'open') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-900/20 border border-yellow-900/30 text-primary text-[10px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> {t('supporting.in_review', 'En Revisión')}
        </span>
      );
    }
    return null;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical':
        return <Settings className="h-5 w-5" />;
      case 'billing':
        return <CreditCard className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const handleCreateTicket = async () => {
    setLoading(true);
    try {
      const response = await supportTicketApi.create({
        subject: ticketForm.subject,
        description: ticketForm.description,
        category: ticketForm.category,
        priority: ticketForm.priority,
      });
      
      if (response.success) {
        const newTicket = response.data;
        setTickets(prev => [newTicket, ...prev]);
        setIsCreateTicketOpen(false);
        setTicketForm({
          subject: '',
          description: '',
          category: 'general',
          priority: 'medium',
        });
        toast.success(t('supporting.ticket_created'));
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error(t('supporting.failed_create'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      const response = await supportTicketApi.addReply(selectedTicket.id, {
        message: newMessage,
      });

      if (response.success) {
        try {
          const ticketResponse = await supportTicketApi.get(selectedTicket.id);
          const updatedTicket = ticketResponse?.data || ticketResponse?.data?.data || ticketResponse;
          
          if (updatedTicket) {
            setTickets(prev => prev.map(ticket => 
              ticket.id === selectedTicket.id ? updatedTicket : ticket
            ));
            setSelectedTicket(updatedTicket);
          }
        } catch (refreshError) {
          console.error('Error refreshing ticket:', refreshError);
        }
        setNewMessage('');
        toast.success(t('supporting.message_sent'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('supporting.failed_send'));
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error(t('supporting.please_enter_suggestion', 'Por favor, ingresa tu sugerencia'));
      return;
    }

    try {
      const response = await feedbackApi.create({
        type: 'feature_request',
        description: feedbackText,
        priority: 'medium',
        video_id: null,
      });

      if (response.success) {
        setFeedbackText('');
        toast.success(t('supporting.thanks_suggestion', '¡Gracias por tu sugerencia!'));
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error(t('supporting.error_send_suggestion', 'Error al enviar sugerencia'));
    }
  };

  const toggleFaq = (faqId: number) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return t('supporting.today', 'Hoy');
      if (diffDays === 1) return t('supporting.yesterday', 'Ayer');
      if (diffDays < 7) return t('supporting.days_ago', { count: diffDays }, `${diffDays} días`);
      
      const dateLocale = locale === 'en' ? 'en-US' : locale === 'pt' ? 'pt-BR' : 'es-ES';
      return date.toLocaleDateString(dateLocale, {
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return '';
    }
  };

  const filteredTickets = tickets.filter((ticket: any) => {
    // Filter by category
    if (selectedCategory === 'billing' && ticket.category !== 'billing') return false;
    if (selectedCategory === 'technical' && ticket.category !== 'technical') return false;
    if (selectedCategory === 'suggestions' && ticket.category !== 'general') return false;
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      const subjectMatch = ticket.subject?.toLowerCase().includes(searchLower);
      const descriptionMatch = ticket.description?.toLowerCase().includes(searchLower);
      const categoryMatch = ticket.category?.toLowerCase().includes(searchLower);
      
      if (!subjectMatch && !descriptionMatch && !categoryMatch) {
        return false;
      }
    }
    
    return true;
  });

  // Filter FAQs by search term
  const filteredFaqs = Object.entries(faqs).reduce((acc, [category, categoryFaqs]) => {
    if (!searchTerm.trim()) {
      acc[category] = categoryFaqs;
      return acc;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = (categoryFaqs as Faq[]).filter((faq: Faq) => {
      const questionMatch = faq.question?.toLowerCase().includes(searchLower);
      const answerMatch = faq.answer?.toLowerCase().includes(searchLower);
      return questionMatch || answerMatch;
    });
    
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    
    return acc;
  }, {} as Record<string, Faq[]>);

  if (loading && !tickets.length) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] pt-32 pb-12">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans antialiased">
      {/* Background gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-[#1a1a1a] to-[#0A0A0A] opacity-60"></div>
        <div className="absolute -top-[10%] left-[20%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]"></div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-12 px-4 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl md:text-5xl font-display font-semibold mb-8 text-white tracking-wide">
          {t('supporting.center', '¿Cómo podemos ayudarte hoy?')}
        </h1>
        
        {/* Search Bar */}
        <div className="w-full max-w-2xl relative mb-10 group">
          <Search className="absolute top-1/2 -translate-y-1/2 left-5 flex items-center text-gray-400 group-focus-within:text-primary transition-colors h-6 w-6" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#141414] border border-white/10 rounded-full py-4 pl-14 pr-6 text-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 shadow-2xl transition-all"
            placeholder={t('supporting.search_placeholder', 'Busca tu problema (ej: Facturación, Reproductor...)')}
            type="text"
          />
        </div>

        {/* Category Buttons */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          <button
            onClick={() => {
              setSelectedCategory('billing');
              setIsCreateTicketOpen(true);
              setTicketForm(prev => ({ ...prev, category: 'billing' }));
            }}
            className="group flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-[#141414] border border-white/5 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-[#1a1a1a] transition-all duration-300 shadow-lg">
              <CreditCard className="text-gray-300 group-hover:text-primary text-3xl transition-colors" />
            </div>
            <span className="text-xs font-medium tracking-wider text-gray-400 group-hover:text-white uppercase">
              {t('supporting.payments', 'Pagos')}
            </span>
          </button>
          
          <button
            onClick={() => {
              setSelectedCategory('technical');
              setIsCreateTicketOpen(true);
              setTicketForm(prev => ({ ...prev, category: 'technical' }));
            }}
            className="group flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-[#141414] border border-white/5 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-[#1a1a1a] transition-all duration-300 shadow-lg">
              <Settings className="text-gray-300 group-hover:text-primary text-3xl transition-colors" />
            </div>
            <span className="text-xs font-medium tracking-wider text-gray-400 group-hover:text-white uppercase">
              {t('supporting.technical_problems', 'Problemas Técnicos')}
            </span>
          </button>
          
          <button
            onClick={() => {
              setSelectedCategory('suggestions');
              setIsCreateTicketOpen(true);
              setTicketForm(prev => ({ ...prev, category: 'general' }));
            }}
            className="group flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-[#141414] border border-white/5 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-[#1a1a1a] transition-all duration-300 shadow-lg">
              <Lightbulb className="text-gray-300 group-hover:text-primary text-3xl transition-colors" />
            </div>
            <span className="text-xs font-medium tracking-wider text-gray-400 group-hover:text-white uppercase">
              {t('supporting.suggestions', 'Sugerencias')}
            </span>
          </button>
        </div>
      </section>

      {/* FAQ Section - Matching Home Screen Implementation */}
      <section className="relative z-10 border-t border-white/5 bg-background-dark/50 backdrop-blur-sm py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-8 sm:mb-10 text-center text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {t('faq.title', 'Preguntas Frecuentes')}
          </h2>
          {faqLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-400">{t('faq.loading', 'Cargando...')}</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {Object.entries(filteredFaqs).flatMap(([category, categoryFaqs]) =>
                categoryFaqs.map((faq: Faq) => (
                  <details
                    key={faq.id}
                    className="group rounded-xl border border-white/5 bg-surface-dark overflow-hidden transition-all duration-300 hover:border-primary/30"
                    open={expandedFAQ === faq.id}
                  >
                    <summary
                      className="flex cursor-pointer items-center justify-between p-4 sm:p-6 text-white outline-none list-none"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFaq(faq.id);
                      }}
                    >
                      <span className="font-bold text-base sm:text-lg pr-4">{faq.question}</span>
                      <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${expandedFAQ === faq.id ? 'rotate-180' : ''} text-gray-400 group-hover:text-primary flex-shrink-0`} />
                    </summary>
                    {expandedFAQ === faq.id && (
                      <div className="border-t border-white/5 bg-black/20 px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4 text-gray-400 leading-relaxed text-sm sm:text-base">
                        {faq.answer}
                      </div>
                    )}
                  </details>
                ))
              )}
              {Object.keys(filteredFaqs).length === 0 && !faqLoading && (
                <div className="text-center py-8">
                  <p className="text-gray-400">
                    {searchTerm.trim() 
                      ? t('faq.no_results_search', 'No se encontraron resultados para tu búsqueda')
                      : t('faq.no_results', 'No hay preguntas frecuentes disponibles')
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Ticket History Section */}
      {user && (
        <section className="max-w-[1200px] mx-auto px-4 pb-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-serif text-white tracking-wide">
                  {t('supporting.ticket_history', 'Historial de Asistencia')}
                </h2>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsCreateTicketOpen(true);
                  }}
                  className="text-xs text-primary hover:text-white transition-colors uppercase tracking-widest font-bold"
                >
                  {t('supporting.view_all', 'Ver Todo')}
                </a>
              </div>
              
              <div className="bg-[#141414] border border-white/5 rounded-lg overflow-hidden shadow-xl">
                <table className="w-full text-left">
                  <thead className="bg-[#1a1a1a] border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-semibold w-1/2">
                        {t('supporting.subject', 'Asunto')}
                      </th>
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                        {t('supporting.status', 'Estado')}
                      </th>
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-semibold text-right">
                        {t('supporting.date', 'Fecha')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTickets.slice(0, 5).map((ticket) => (
                      <tr
                        key={ticket.id}
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setIsTicketDetailOpen(true);
                        }}
                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            {getCategoryIcon(ticket.category || 'general')}
                            <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                              {ticket.subject || t('supporting.no_subject')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {getStatusBadge(ticket.status)}
                        </td>
                        <td className="px-6 py-5 text-right text-sm text-gray-500">
                          {formatDate(ticket.created_at)}
                        </td>
                      </tr>
                    ))}
                    {filteredTickets.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-400">
                          {t('supporting.no_tickets_yet', 'No hay tickets aún')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                <div className="p-6 border-t border-white/5 bg-[#161616]">
                  <Button
                    onClick={() => setIsCreateTicketOpen(true)}
                    className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-primary hover:bg-[#8e493e] text-white text-xs font-bold uppercase tracking-widest rounded transition-all shadow-[0_4px_14px_rgba(160,82,69,0.3)] hover:shadow-[0_6px_20px_rgba(160,82,69,0.4)]"
                  >
                    <Plus className="h-4 w-4" />
                    {t('supporting.create_new_ticket', 'Crear Nuevo Ticket')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Feedback Sidebar */}
            <div className="lg:col-span-3 flex flex-col">
              <h2 className="text-xl font-serif text-white tracking-wide mb-6">
                {t('supporting.feedback_community', 'Feedback y Comunidad')}
              </h2>
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#121212] border border-white/10 rounded-lg p-6 relative overflow-hidden flex-grow flex flex-col">
                <div className="absolute -right-4 -bottom-4 text-white/[0.03]">
                  <Lightbulb className="h-[140px] w-[140px]" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-2">
                    {t('supporting.help_us_improve', 'Ayúdanos a Mejorar')}
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed mb-6 font-light">
                    {t('supporting.feedback_description', 'Tu opinión esculpe Sacrart. ¿Qué curso te gustaría ver después?')}
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmitFeedback();
                    }}
                    className="space-y-4"
                  >
                    <Textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded p-3 text-sm text-white placeholder-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none h-32 transition-colors"
                      placeholder={t('supporting.feedback_placeholder', 'Me gustaría aprender sobre...')}
                    />
                    <Button
                      type="submit"
                      className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-bold uppercase tracking-widest rounded transition-all"
                    >
                      {t('supporting.send_suggestion', 'Enviar Sugerencia')}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
        <DialogContent className="sm:max-w-[600px] bg-[#141414] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{t('supporting.create_ticket_title', 'Crear Nuevo Ticket')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('supporting.create_ticket_desc', 'Describe tu problema y nuestro equipo te ayudará')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-white">{t('supporting.subject', 'Asunto')}</Label>
              <Input
                id="subject"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder={t('supporting.brief_description', 'Breve descripción')}
                className="bg-[#1a1a1a] border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-white">{t('supporting.category', 'Categoría')}</Label>
                <select
                  id="category"
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white"
                >
                  <option value="technical">{t('supporting.technical', 'Técnico')}</option>
                  <option value="billing">{t('supporting.billing', 'Facturación')}</option>
                  <option value="account">{t('supporting.account', 'Cuenta')}</option>
                  <option value="content">{t('supporting.content', 'Contenido')}</option>
                  <option value="general">{t('supporting.general', 'General')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-white">{t('supporting.priority', 'Prioridad')}</Label>
                <select
                  id="priority"
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white"
                >
                  <option value="low">{t('supporting.low', 'Baja')}</option>
                  <option value="medium">{t('supporting.medium', 'Media')}</option>
                  <option value="high">{t('supporting.high', 'Alta')}</option>
                  <option value="urgent">{t('supporting.urgent', 'Urgente')}</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">{t('supporting.description', 'Descripción')}</Label>
              <Textarea
                id="description"
                value={ticketForm.description}
                onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('supporting.provide_detail', 'Proporciona más detalles')}
                className="min-h-[120px] bg-[#1a1a1a] border-white/10 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTicketOpen(false)} className="border-white/10">
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={!ticketForm.subject || !ticketForm.description || loading}
              className="bg-primary hover:bg-[#8e493e]"
            >
              {t('supporting.create_ticket_btn', 'Crear Ticket')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog open={isTicketDetailOpen} onOpenChange={setIsTicketDetailOpen}>
        <DialogContent className="sm:max-w-[700px] bg-[#141414] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <span>{selectedTicket?.subject || t('supporting.no_subject')}</span>
              <span className="text-sm text-gray-400">#{selectedTicket?.id}</span>
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              <div className="flex items-center space-x-4 mt-2">
                {selectedTicket && getStatusBadge(selectedTicket.status)}
              </div>
            </DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              {selectedTicket.description && (
                <div className="p-3 bg-[#1a1a1a] rounded-lg">
                  <p className="text-sm text-gray-300">{selectedTicket.description}</p>
                </div>
              )}
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedTicket.replies?.map((reply) => (
                  <div key={reply.id} className={`flex ${(reply.user_id === user?.id) ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      (reply.user_id === user?.id)
                        ? 'bg-primary text-white'
                        : 'bg-[#1a1a1a] text-gray-300'
                    }`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium">{reply.user?.name || t('supporting.support_user', 'Soporte')}</span>
                        <span className="text-xs opacity-70">{formatDate(reply.created_at || reply.updated_at)}</span>
                      </div>
                      <p className="text-sm">{reply.message || ''}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                <div className="border-t border-white/10 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="newMessage" className="text-white">{t('supporting.reply', 'Responder')}</Label>
                    <Textarea
                      id="newMessage"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t('supporting.type_message', 'Escribe tu mensaje...')}
                      className="min-h-[80px] bg-[#1a1a1a] border-white/10 text-white"
                    />
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()} className="bg-primary hover:bg-[#8e493e]">
                      {t('supporting.send_message', 'Enviar')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTicketDetailOpen(false)} className="border-white/10">
              {t('supporting.close', 'Cerrar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Support;
