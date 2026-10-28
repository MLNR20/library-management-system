using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace LibraryManagementSystem.Server.Filters
{
    // Runs the registered FluentValidation validator (if any) for every action argument and
    // short-circuits with a 400 validation problem, so controllers never see an invalid request.
    public class ValidationFilter(IServiceProvider services) : IAsyncActionFilter
    {
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var modelState = new ModelStateDictionary();

            foreach (var argument in context.ActionArguments.Values)
            {
                if (argument is null)
                {
                    continue;
                }

                var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
                if (services.GetService(validatorType) is not IValidator validator)
                {
                    continue;
                }

                var result = await validator.ValidateAsync(
                    new ValidationContext<object>(argument), context.HttpContext.RequestAborted);

                foreach (var failure in result.Errors)
                {
                    modelState.AddModelError(failure.PropertyName, failure.ErrorMessage);
                }
            }

            if (!modelState.IsValid)
            {
                var factory = context.HttpContext.RequestServices.GetRequiredService<ProblemDetailsFactory>();
                var problem = factory.CreateValidationProblemDetails(context.HttpContext, modelState);
                context.Result = new ObjectResult(problem) { StatusCode = StatusCodes.Status400BadRequest };
                return;
            }

            await next();
        }
    }
}
